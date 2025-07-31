import postcss from 'postcss';
import { defaultScreens, defaultContainerScreens, formatBreakpointsRegexMatches, formatContainerBreakpointsRegexMatches, convertSortScreens } from './screens.js';
import { extractTwoValidClampArgs, convertToRem, generateClamp } from './utils.js';

const clampwind = (opts = {}) => {
  let rootFontSize = 16;
  let spacingSize = 0.25;
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
    configReady: false
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
  const processClampDeclaration = (decl, minScreen, maxScreen, isContainer = false, result) => {
    const args = extractTwoValidClampArgs(decl.value);
    const [lower, upper] = args.map(val => convertToRem(val, rootFontSize, spacingSize, customProperties));
    
    if (!args || !lower || !upper) {
      result.warn('Invalid clamp() values', { node: decl });
      decl.value = ` ${decl.value} /* Invalid clamp() values */`;
      return false;
    }

    const clamp = generateClamp(lower, upper, minScreen, maxScreen, rootFontSize, spacingSize, isContainer);
    decl.value = clamp;
    return true;
  };

  return {
    postcssPlugin: 'clampwind',
    prepare() {
      return {
        // MARK: Declaration - Collect configuration
        Declaration(decl) {
          // Collect theme variables from :root
          if (decl.parent?.selector === ':root') {
            if (decl.prop.startsWith('--breakpoint-')) {
              const key = decl.prop.replace('--breakpoint-', '');
              config.rootElementBreakpoints[key] = decl.value;
            }
            if (decl.prop.startsWith('--container-')) {
              const key = decl.prop.replace('--container-', '@');
              config.rootElementContainerBreakpoints[key] = decl.value;
            }
            if (decl.prop === '--text-base' && decl.value.includes('px')) {
              rootFontSize = parseFloat(decl.value);
            }
            if (decl.prop === 'font-size' && decl.value.includes('px')) {
              rootFontSize = parseFloat(decl.value);
            }
            if (decl.prop === '--spacing') {
              spacingSize = parseFloat(convertToRem(decl.value, rootFontSize, spacingSize, customProperties));
            }
            if (decl.prop.startsWith('--')) {
              const value = parseFloat(convertToRem(decl.value, rootFontSize, spacingSize, customProperties));
              if (value) customProperties[decl.prop] = value;
            }
          }
        },

        // MARK: AtRule
        AtRule: {
          // MARK: - - Layers - Collect configuration
          layer(atRule) {
            // Default layer
            if (atRule.params === 'default' && !Object.keys(config.defaultLayerBreakpoints).length) {
              const css = atRule.source.input.css;
              const matches = css.match(/--breakpoint-[^:]+:\s*[^;]+/g) || [];
              config.defaultLayerBreakpoints = formatBreakpointsRegexMatches(matches);
            }
            if (atRule.params === 'default' && !Object.keys(config.defaultLayerContainerBreakpoints).length) {
              const css = atRule.source.input.css;
              const matches = css.match(/--container-[^:]+:\s*[^;]+/g) || [];
              config.defaultLayerContainerBreakpoints = formatContainerBreakpointsRegexMatches(matches);
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
                if (decl.prop === '--text-base' && decl.value.includes('px')) {
                  rootFontSize = parseFloat(decl.value);
                }
                if (decl.prop === '--spacing') {
                  spacingSize = parseFloat(convertToRem(decl.value, rootFontSize, spacingSize, customProperties));
                }
                if (decl.prop.startsWith('--')) {
                  const value = parseFloat(convertToRem(decl.value, rootFontSize, spacingSize, customProperties));
                  if (value) customProperties[decl.prop] = value;
                }
              });
            }
          },

          // MARK: - - Media - Process immediately
          media(atRule) {
            finalizeConfig(); // Ensure config is ready
            
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
              const maxScreen = ([atRule.parent.params, atRule.params])
                .filter(p => p.includes('<'))
                .map(p => p.match(/<([^)]+)/)?.[1]?.trim())[0];
              
              const minScreen = ([atRule.parent.params, atRule.params])
                .filter(p => p.includes('>'))
                .map(p => p.match(/>=?([^)]+)/)?.[1]?.trim())[0];

              if (minScreen && maxScreen) {
                clampDecls.forEach(decl => {
                  processClampDeclaration(decl, minScreen, maxScreen, false, atRule.root().result);
                });
              }
              return;
            }

            // Handle invalid nesting
            if (isNested && !isSameAtRule) {
              clampDecls.forEach(decl => {
                decl.value = ` ${decl.value} /* Invalid nested @media and @container rules */`;
              });
              return;
            }

            // Handle single media queries
            const screenValues = Object.values(screens);
            const newMediaQueries = [];

            clampDecls.forEach(decl => {
              // Upper breakpoints (>= syntax)
              if (atRule.params.includes('>')) {
                const match = atRule.params.match(/>=?([^)]+)/);
                if (match) {
                  const minScreen = match[1].trim();
                  const maxScreen = screenValues[screenValues.length - 1];

                  const newAtRule = postcss.atRule({ 
                    name: 'media', 
                    params: `(width >= ${minScreen})`,
                    source: atRule.source
                  });
                  
                  const newDecl = postcss.decl({ 
                    prop: decl.prop, 
                    value: decl.value,
                    source: decl.source
                  });
                  
                  if (processClampDeclaration(newDecl, minScreen, maxScreen, false, atRule.root().result)) {
                    newAtRule.append(newDecl);
                    newMediaQueries.push(newAtRule);
                  }
                }
              }
              // Lower breakpoints (< syntax)
              else if (atRule.params.includes('<')) {
                const match = atRule.params.match(/<([^)]+)/);
                if (match) {
                  const minScreen = screenValues[0];
                  const maxScreen = match[1].trim();

                  const newAtRule = postcss.atRule({ 
                    name: 'media', 
                    params: atRule.params,
                    source: atRule.source
                  });
                  
                  const newDecl = postcss.decl({ 
                    prop: decl.prop, 
                    value: decl.value,
                    source: decl.source
                  });
                  
                  if (processClampDeclaration(newDecl, minScreen, maxScreen, false, atRule.root().result)) {
                    newAtRule.append(newDecl);
                    newMediaQueries.push(newAtRule);
                  }
                }
              }
            });

            // Insert new media queries and remove the old one
            newMediaQueries.forEach(mq => {
              atRule.parent.insertBefore(atRule, mq);
            });
            
            if (newMediaQueries.length > 0) {
              atRule.remove();
            }
          },

          // MARK: - - Container - Process immediately
          container(atRule) {
            finalizeConfig(); // Ensure config is ready
            
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
              const maxContainer = ([atRule.parent.params, atRule.params])
                .filter(p => p.includes('<'))
                .map(p => p.match(/<([^)]+)/)?.[1]?.trim())[0];
              
              const minContainer = ([atRule.parent.params, atRule.params])
                .filter(p => p.includes('>'))
                .map(p => p.match(/>=?([^)]+)/)?.[1]?.trim())[0];

              if (minContainer && maxContainer) {
                clampDecls.forEach(decl => {
                  processClampDeclaration(decl, minContainer, maxContainer, true, atRule.root().result);
                });
              }
              return;
            }

            // Handle invalid nesting
            if (isNested && !isSameAtRule) {
              clampDecls.forEach(decl => {
                decl.value = ` ${decl.value} /* Invalid nested @media and @container rules */`;
              });
              return;
            }

            // Handle single container queries
            const screenValues = Object.values(containerScreens);
            const containerNameMatches = atRule.params.match(/^([^\s(]+)\s*\(/);
            const containerName = containerNameMatches ? containerNameMatches[1].trim() : '';
            const newContainerQueries = [];

            clampDecls.forEach(decl => {
              // Upper breakpoints (>= syntax)
              if (atRule.params.includes('>')) {
                const match = atRule.params.match(/>=?([^)]+)/);
                if (match) {
                  const minContainer = match[1].trim();
                  const maxContainer = screenValues[screenValues.length - 1];

                  const newAtRule = postcss.atRule({ 
                    name: 'container', 
                    params: `${containerName} (width >= ${minContainer})`,
                    source: atRule.source
                  });
                  
                  const newDecl = postcss.decl({ 
                    prop: decl.prop, 
                    value: decl.value,
                    source: decl.source
                  });
                  
                  if (processClampDeclaration(newDecl, minContainer, maxContainer, true, atRule.root().result)) {
                    newAtRule.append(newDecl);
                    newContainerQueries.push(newAtRule);
                  }
                }
              }
              // Lower breakpoints (< syntax)
              else if (atRule.params.includes('<')) {
                const match = atRule.params.match(/<([^)]+)/);
                if (match) {
                  const minContainer = screenValues[0];
                  const maxContainer = match[1].trim();

                  const newAtRule = postcss.atRule({ 
                    name: 'container', 
                    params: `${containerName} ${atRule.params}`,
                    source: atRule.source
                  });
                  
                  const newDecl = postcss.decl({ 
                    prop: decl.prop, 
                    value: decl.value,
                    source: decl.source
                  });
                  
                  if (processClampDeclaration(newDecl, minContainer, maxContainer, true, atRule.root().result)) {
                    newAtRule.append(newDecl);
                    newContainerQueries.push(newAtRule);
                  }
                }
              }
            });

            // Insert new container queries and remove the old one
            newContainerQueries.forEach(cq => {
              atRule.parent.insertBefore(atRule, cq);
            });
            
            if (newContainerQueries.length > 0) {
              atRule.remove();
            }
          }
        },

        // MARK: Rule - Process no-media rules immediately
        Rule(rule) {
          finalizeConfig(); // Ensure config is ready
          
          // Skip if this rule has @media children (they'll be handled separately)
          const hasMediaChild = (rule.nodes || []).some(
            n => n.type === 'atrule' && (n.name === 'media' || n.name === 'container')
          );
          if (hasMediaChild) return;

          // Find clamp declarations and process them immediately
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
            const newDecl = postcss.decl({ 
              prop: decl.prop, 
              value: decl.value,
              source: decl.source
            });
            
            if (processClampDeclaration(newDecl, minScreen, maxScreen, false, rule.root().result)) {
              rule.insertAfter(decl, newDecl);
              decl.remove();
            }
          });
        }
      };
    }
  };
};

clampwind.postcss = true;

export default clampwind;