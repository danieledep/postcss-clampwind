import postcss from 'postcss';
import { defaultScreens, defaultContainerScreens, formatBreakpointsRegexMatches, formatContainerBreakpointsRegexMatches, convertSortScreens } from './screens.js';
import { extractTwoValidClampArgs, convertToRem, generateClamp } from './utils.js';

const clampwind = (opts = {}) => {
  return {
    postcssPlugin: 'clampwind',
    prepare() {
      // Configuration variables
      let rootFontSize = 16;
      let spacingSize = "1px";
      let customProperties = {};
      let screens = defaultScreens || {};
      let containerScreens = defaultContainerScreens || {};
      
      // Configuration collected from theme layers and root
      const config = {
        defaultLayerBreakpoints: {},
        defaultLayerContainerBreakpoints: {},
        themeLayerBreakpoints: {},
        themeLayerContainerBreakpoints: {},
        rootElementBreakpoints: {},
        rootElementContainerBreakpoints: {},
        configCollected: false,
        configReady: false
      };

      // Helper function to collect configuration
      const collectConfig = (root) => {
        if (config.configCollected) return;
        
        // Collect root font size from :root
        root.walkDecls(decl => {
          if (decl.parent?.selector === ':root') {
            if (decl.prop === 'font-size' && decl.value.includes('px')) {
              rootFontSize = parseFloat(decl.value);
            }
            if (decl.prop === '--text-base' && decl.value.includes('px')) {
              rootFontSize = parseFloat(decl.value);
            }
          }
        });

        // Collect custom properties from :root
        root.walkDecls(decl => {
          if (decl.parent?.selector === ':root') {
            if (decl.prop.startsWith('--breakpoint-')) {
              const key = decl.prop.replace('--breakpoint-', '');
              config.rootElementBreakpoints[key] = decl.value;
            }
            if (decl.prop.startsWith('--container-')) {
              const key = decl.prop.replace('--container-', '@');
              config.rootElementContainerBreakpoints[key] = decl.value;
            }
            if (decl.prop === '--spacing') {
              spacingSize = decl.value;
            }
            if (decl.prop.startsWith('--')) {
              const value = parseFloat(convertToRem(decl.value, rootFontSize, spacingSize, customProperties));
              if (value) customProperties[decl.prop] = value;
            }
          }
        });

        // Collect root font size from theme layer
        root.walkAtRules('layer', atRule => {
          if (atRule.params === 'theme') {
            atRule.walkDecls(decl => {
              if (decl.prop === '--text-base' && decl.value.includes('px')) {
                rootFontSize = parseFloat(decl.value);
              }
            });
          }
        });

        // Collect custom properties from layers
        root.walkAtRules('layer', atRule => {
          // Default layer
          if (atRule.params === 'default') {
            if (!Object.keys(config.defaultLayerBreakpoints).length) {
              atRule.walkDecls(decl => {
                if (decl.prop.startsWith('--breakpoint-')) {
                  const key = decl.prop.replace('--breakpoint-', '');
                  config.defaultLayerBreakpoints[key] = decl.value;
                }
                if (decl.prop.startsWith('--container-')) {
                  const key = decl.prop.replace('--container-', '@');
                  config.defaultLayerContainerBreakpoints[key] = decl.value;
                }
              });
            }
          }
          
          // Theme layer
          if (atRule.params === 'theme') {
            atRule.walkDecls(decl => {
              if (decl.prop.startsWith('--breakpoint-')) {
                const key = decl.prop.replace('--breakpoint-', '');
                config.themeLayerBreakpoints[key] = decl.value;
              }
              if (decl.prop.startsWith('--container-')) {
                const key = decl.prop.replace('--container-', '@');
                config.themeLayerContainerBreakpoints[key] = decl.value;
              }
              if (decl.prop === '--spacing') {
                spacingSize = decl.value;
              }
              if (decl.prop.startsWith('--')) {
                const value = parseFloat(convertToRem(decl.value, rootFontSize, spacingSize, customProperties));
                if (value) customProperties[decl.prop] = value;
              }
            });
          }
        });
        
        config.configCollected = true;
      };

      // Helper function to finalize configuration
      const finalizeConfig = () => {
        if (config.configReady) return;
        
        // Join, convert and sort screens breakpoints from theme, root and layer
        screens = Object.assign(
          {},
          screens,
          config.defaultLayerBreakpoints,
          config.rootElementBreakpoints,
          config.themeLayerBreakpoints
        );
        screens = convertSortScreens(screens, rootFontSize);

        // Join, convert and sort container breakpoints from theme, root and layer
        containerScreens = Object.assign(
          {},
          containerScreens,
          config.defaultLayerContainerBreakpoints,
          config.rootElementContainerBreakpoints,
          config.themeLayerContainerBreakpoints
        );
        containerScreens = convertSortScreens(containerScreens, rootFontSize);
        
        config.configReady = true;
      };

      // Helper function to process clamp declarations
      const processClampDeclaration = (decl, minScreen, maxScreen, isContainer = false) => {
        const args = extractTwoValidClampArgs(decl.value);
        const [lower, upper] = args.map(val => convertToRem(val, rootFontSize, spacingSize, customProperties));

        if (!args || !lower || !upper) {
          console.warn('Invalid clamp() values', { node: decl });
          decl.value = ` ${decl.value} /* Invalid clamp() values */`;
          return true;
        }
        const clamp = generateClamp(lower, upper, minScreen, maxScreen, rootFontSize, spacingSize, isContainer);
        decl.value = clamp;
        return true;
      };

      return {
        // Use OnceExit to ensure Tailwind has generated its content
        OnceExit(root, { result }) {
          // Collect all configuration after Tailwind has processed
          collectConfig(root);
          finalizeConfig();
          
          // Now process all clamp declarations in the entire tree
          // Process media queries
          root.walkAtRules('media', atRule => {
            const isNested = atRule.parent?.type === 'atrule';
            const isSameAtRule = atRule.parent?.name === atRule.name;

            // Find all clamp declarations
            const clampDecls = [];
            atRule.walkDecls(decl => {
              if (extractTwoValidClampArgs(decl.value)) {
                clampDecls.push(decl);
              }
            });

            if (!clampDecls.length) return;

            // Handle nested media queries (double MQ)
            if (isNested && isSameAtRule) {
              const parentParams = atRule.parent.params;
              const currentParams = atRule.params;
              
              let minScreen = null;
              let maxScreen = null;
              
              // Extract min from >= conditions
              if (parentParams.includes('>')) {
                const match = parentParams.match(/>=?\s*([^)]+)/);
                if (match) minScreen = match[1].trim();
              }
              if (currentParams.includes('>') && !minScreen) {
                const match = currentParams.match(/>=?\s*([^)]+)/);
                if (match) minScreen = match[1].trim();
              }
              
              // Extract max from < conditions
              if (parentParams.includes('<')) {
                const match = parentParams.match(/<\s*([^)]+)/);
                if (match) maxScreen = match[1].trim();
              }
              if (currentParams.includes('<') && !maxScreen) {
                const match = currentParams.match(/<\s*([^)]+)/);
                if (match) maxScreen = match[1].trim();
              }

              if (minScreen && maxScreen) {
                clampDecls.forEach(decl => {
                  processClampDeclaration(decl, minScreen, maxScreen, false);
                });
              }
              return;
            }

            // Handle invalid nesting
            if (isNested && !isSameAtRule) {
              clampDecls.forEach(decl => {
                decl.value = ` ${decl.value} /* Invalid nested @media rules */`;
              });
              return;
            }

            // Handle single media queries
            const screenValues = Object.values(screens);
            
            clampDecls.forEach(decl => {
              // Upper breakpoints (>= syntax)
              if (atRule.params.includes('>')) {
                const match = atRule.params.match(/>=?\s*([^)]+)/);
                if (match) {
                  const minScreen = match[1].trim();
                  const maxScreen = screenValues[screenValues.length - 1];
                  
                  processClampDeclaration(decl, minScreen, maxScreen, false);
                }
              }
              // Lower breakpoints (< syntax)
              else if (atRule.params.includes('<')) {
                const match = atRule.params.match(/<\s*([^)]+)/);
                if (match) {
                  const minScreen = screenValues[0];
                  const maxScreen = match[1].trim();
                  
                  processClampDeclaration(decl, minScreen, maxScreen, false);
                }
              }
            });
          });

          // Process container queries
          root.walkAtRules('container', atRule => {
            const isNested = atRule.parent?.type === 'atrule';
            const isSameAtRule = atRule.parent?.name === atRule.name;

            // Find all clamp declarations
            const clampDecls = [];
            atRule.walkDecls(decl => {
              if (extractTwoValidClampArgs(decl.value)) {
                clampDecls.push(decl);
              }
            });

            if (!clampDecls.length) return;

            // Handle nested container queries (double CQ)
            if (isNested && isSameAtRule) {
              const parentParams = atRule.parent.params;
              const currentParams = atRule.params;
              
              let minContainer = null;
              let maxContainer = null;
              
              // Extract min from >= conditions
              if (parentParams.includes('>')) {
                const match = parentParams.match(/>=?\s*([^)]+)/);
                if (match) minContainer = match[1].trim();
              }
              if (currentParams.includes('>') && !minContainer) {
                const match = currentParams.match(/>=?\s*([^)]+)/);
                if (match) minContainer = match[1].trim();
              }
              
              // Extract max from < conditions
              if (parentParams.includes('<')) {
                const match = parentParams.match(/<\s*([^)]+)/);
                if (match) maxContainer = match[1].trim();
              }
              if (currentParams.includes('<') && !maxContainer) {
                const match = currentParams.match(/<\s*([^)]+)/);
                if (match) maxContainer = match[1].trim();
              }

              if (minContainer && maxContainer) {
                clampDecls.forEach(decl => {
                  processClampDeclaration(decl, minContainer, maxContainer, true);
                });
              }
              return;
            }

            // Handle invalid nesting
            if (isNested && !isSameAtRule) {
              clampDecls.forEach(decl => {
                decl.value = ` ${decl.value} /* Invalid nested @container rules */`;
              });
              return;
            }

            // Handle single container queries
            const screenValues = Object.values(containerScreens);
            
            clampDecls.forEach(decl => {
              // Upper breakpoints (>= syntax)
              if (atRule.params.includes('>')) {
                const match = atRule.params.match(/>=?\s*([^)]+)/);
                if (match) {
                  const minContainer = match[1].trim();
                  const maxContainer = screenValues[screenValues.length - 1];
                  
                  processClampDeclaration(decl, minContainer, maxContainer, true);
                }
              }
              // Lower breakpoints (< syntax)
              else if (atRule.params.includes('<')) {
                const match = atRule.params.match(/<\s*([^)]+)/);
                if (match) {
                  const minContainer = screenValues[0];
                  const maxContainer = match[1].trim();
                  
                  processClampDeclaration(decl, minContainer, maxContainer, true);
                }
              }
            });
          });

          // Process regular rules (not inside media/container queries)
          root.walkRules(rule => {
            // Skip if inside a media or container query (they were already processed)
            let parent = rule.parent;
            while (parent) {
              if (parent.type === 'atrule' && (parent.name === 'media' || parent.name === 'container')) {
                return; // Skip this rule, it's inside a media/container query
              }
              parent = parent.parent;
            }

            // Find and process clamp declarations
            const clampDecls = [];
            rule.walkDecls(decl => {
              if (extractTwoValidClampArgs(decl.value)) {
                clampDecls.push(decl);
              }
            });

            if (clampDecls.length === 0) return;

            const screenValues = Object.values(screens);
            const minScreen = screenValues[0];
            const maxScreen = screenValues[screenValues.length - 1];

            clampDecls.forEach(decl => {
              processClampDeclaration(decl, minScreen, maxScreen, false);
            });
          });
        }
      };
    }
  };
};

clampwind.postcss = true;

export default clampwind;