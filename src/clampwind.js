import { defaultScreens, defaultContainerScreens } from "./screens.js";
import {
  extractTwoValidClampArgs,
  convertToRem,
  generateClamp,
  sortScreens,
  extractMaxValue,
  extractMinValue
} from "./utils.js";

const clampwind = (opts = {}) => {
  return {
    postcssPlugin: "postcss-clampwind",
    prepare(result) {
      // Configuration variables
      let rootFontSize = 16;
      let spacingSize = "0.25rem";
      let customProperties = {};
      let screens = defaultScreens || {};
      let containerScreens = defaultContainerScreens || {};
      let defaultClampRange = {};

      // Configuration collected from theme layers and root
      const config = {
        themeLayerBreakpoints: {},
        themeLayerContainerBreakpoints: {},
        rootElementBreakpoints: {},
        rootElementContainerBreakpoints: {},
        configCollected: false,
        configReady: false,
      };

      // Helper function to collect configuration
      const collectConfig = (root) => {
        if (config.configCollected) return;

        // Collect root font size from :root
        root.walkDecls((decl) => {
          if (decl.parent?.selector === ":root") {
            if (decl.prop === "font-size" && decl.value.includes("px")) {
              rootFontSize = parseFloat(decl.value);
            }
            if (decl.prop === "--text-base" && decl.value.includes("px")) {
              rootFontSize = parseFloat(decl.value);
            }
          }
        });

        // Collect custom properties from :root
        root.walkDecls((decl) => {
          if (decl.parent?.selector === ":root") {
            if (decl.prop.startsWith("--breakpoint-")) {
              const key = decl.prop.replace("--breakpoint-", "");
              config.rootElementBreakpoints[key] = convertToRem(
                decl.value,
                rootFontSize,
                spacingSize,
                customProperties
              );
            }
            if (decl.prop.startsWith("--container-")) {
              const key = decl.prop.replace("--container-", "@");
              config.rootElementContainerBreakpoints[key] = convertToRem(
                decl.value,
                rootFontSize,
                spacingSize,
                customProperties
              );
            }
            if (decl.prop === "--breakpoint-clamp-min") {
              defaultClampRange.min = convertToRem(
                decl.value,
                rootFontSize,
                spacingSize,
                customProperties
              );
            }
            if (decl.prop === "--breakpoint-clamp-max") {
              defaultClampRange.max = convertToRem(
                decl.value,
                rootFontSize,
                spacingSize,
                customProperties
              );
            }
            if (decl.prop === "--spacing") {
              spacingSize = decl.value;
            }
            if (decl.prop.startsWith("--")) {
              const value = convertToRem(
                decl.value,
                rootFontSize,
                spacingSize,
                customProperties
              );
              if (value) customProperties[decl.prop] = value;
            }
          }
        });

        // Collect root font size from theme layer
        root.walkAtRules("layer", (atRule) => {
          if (atRule.params === "theme") {
            atRule.walkDecls((decl) => {
              if (decl.prop === "--text-base" && decl.value.includes("px")) {
                rootFontSize = parseFloat(decl.value);
              }
            });
          }
        });

        // Collect custom properties from layers
        root.walkAtRules("layer", (atRule) => {
          // Theme layer
          if (atRule.params === "theme") {
            atRule.walkDecls((decl) => {
              if (decl.prop.startsWith("--breakpoint-")) {
                const key = decl.prop.replace("--breakpoint-", "");
                config.themeLayerBreakpoints[key] = convertToRem(
                  decl.value,
                  rootFontSize,
                  spacingSize,
                  customProperties
                );
              }
              if (decl.prop.startsWith("--container-")) {
                const key = decl.prop.replace("--container-", "@");
                config.themeLayerContainerBreakpoints[key] = convertToRem(
                  decl.value,
                  rootFontSize,
                  spacingSize,
                  customProperties
                );
              }
              if (decl.prop === "--breakpoint-clamp-min") {
                defaultClampRange.min = convertToRem(
                  decl.value,
                  rootFontSize,
                  spacingSize,
                  customProperties
                );
              }
              if (decl.prop === "--breakpoint-clamp-max") {
                defaultClampRange.max = convertToRem(
                  decl.value,
                  rootFontSize,
                  spacingSize,
                  customProperties
                );
              }
              if (decl.prop === "--spacing") {
                spacingSize = decl.value;
              }
              if (decl.prop.startsWith("--")) {
                const value = convertToRem(
                  decl.value,
                  rootFontSize,
                  spacingSize,
                  customProperties
                );
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
          config.rootElementBreakpoints,
          config.themeLayerBreakpoints
        );
        screens = sortScreens(screens);

        // Join, convert and sort container breakpoints from theme, root and layer
        containerScreens = Object.assign(
          {},
          containerScreens,
          config.rootElementContainerBreakpoints,
          config.themeLayerContainerBreakpoints
        );
        containerScreens = sortScreens(containerScreens);

        config.configReady = true;
      };

      // Helper function to process clamp declarations
      const processClampDeclaration = (
        decl,
        minScreen,
        maxScreen,
        isContainer = false
      ) => {
        const args = extractTwoValidClampArgs(decl.value);
        const [lower, upper] = args.map((val) =>
          convertToRem(val, rootFontSize, spacingSize, customProperties)
        );

        if (!args || !lower || !upper) {
          result.warn(
            `Invalid clamp() values: "${decl.value}". Expected format: clamp(min, preferred, max)`,
            { 
              node: decl,
              word: decl.value 
            }
          );
          
          decl.value = `${decl.value} /* Invalid clamp() values */`;
          return true;
        }
        const clamp = generateClamp(
          lower,
          upper,
          minScreen,
          maxScreen,
          rootFontSize,
          spacingSize,
          isContainer
        );
        decl.value = clamp;
        return true;
      };

      // Helper to check if we're in dev or build environment
      const getNestedStructure = (atRule) => {
        // Check if this atRule is nested inside another media query
        const isNested = atRule.parent?.type === "atrule" && atRule.parent?.name === "media";
        
        // Check if the atRule contains nested media queries (build structure)
        const hasNestedMedia = atRule.nodes?.some(
          node => node.type === 'atrule' && node.name === 'media'
        );
        
        return { isNested, hasNestedMedia };
      };

      // Process media queries with nested structure awareness
      const processMediaQuery = (atRule, parentAtRule = null) => {
        const clampDecls = [];
        atRule.walkDecls((decl) => {
          if (extractTwoValidClampArgs(decl.value)) {
            clampDecls.push(decl);
          }
        });

        if (!clampDecls.length) return;

        const screenValues = Object.values(screens);
        
        // Handle nested media queries
        if (parentAtRule) {
          const currentParams = atRule.params;
          const parentParams = parentAtRule.params;

          const minScreen = extractMinValue(parentParams) || extractMinValue(currentParams);
          const maxScreen = extractMaxValue(parentParams) || extractMaxValue(currentParams);

          if (minScreen && maxScreen) {
            clampDecls.forEach((decl) => {
              processClampDeclaration(decl, minScreen, maxScreen, false);
            });
          }
        } else {
          // MARK: Single MQ
          const currentParams = atRule.params;
          const minValue = extractMinValue(currentParams);
          const maxValue = extractMaxValue(currentParams);

          if (minValue && !maxValue) {
            const minScreen = minValue;
            const maxScreen = defaultClampRange.max || screenValues[screenValues.length - 1];
            clampDecls.forEach((decl) => {
              processClampDeclaration(decl, minScreen, maxScreen, false);
            });
          } else if (maxValue && !minValue) {
            const minScreen = defaultClampRange.min || screenValues[0];
            const maxScreen = maxValue;
            clampDecls.forEach((decl) => {
              processClampDeclaration(decl, minScreen, maxScreen, false);
            });
          } else if (minValue && maxValue) {
            clampDecls.forEach((decl) => {
              processClampDeclaration(decl, minValue, maxValue, false);
            });
          }
        }
      };

      // Process container queries with nested structure awareness
      const processContainerQuery = (atRule, parentAtRule = null) => {
        const clampDecls = [];
        atRule.walkDecls((decl) => {
          if (extractTwoValidClampArgs(decl.value)) {
            clampDecls.push(decl);
          }
        });

        if (!clampDecls.length) return;

        const containerValues = Object.values(containerScreens);
        
        // Handle nested container queries
        if (parentAtRule) {
          const currentParams = atRule.params;
          const parentParams = parentAtRule.params;

          const minContainer = extractMinValue(parentParams) || extractMinValue(currentParams);
          const maxContainer = extractMaxValue(parentParams) || extractMaxValue(currentParams);

          if (minContainer && maxContainer) {
            clampDecls.forEach((decl) => {
              processClampDeclaration(decl, minContainer, maxContainer, true);
            });
          }
        } else {
          // MARK: Single CQ
          const currentParams = atRule.params;
          const minValue = extractMinValue(currentParams);
          const maxValue = extractMaxValue(currentParams);

          if (minValue && !maxValue) {
            const minContainer = minValue;
            const maxContainer = containerValues[containerValues.length - 1];
            clampDecls.forEach((decl) => {
              processClampDeclaration(decl, minContainer, maxContainer, true);
            });
          } else if (maxValue && !minValue) {
            const minContainer = containerValues[0];
            const maxContainer = maxValue;
            clampDecls.forEach((decl) => {
              processClampDeclaration(decl, minContainer, maxContainer, true);
            });
          } else if (minValue && maxValue) {
            clampDecls.forEach((decl) => {
              processClampDeclaration(decl, minValue, maxValue, true);
            });
          }
        }
      };

      return {
        // Use OnceExit to ensure Tailwind has generated its content
        OnceExit(root, { result }) {
          // Collect all configuration after Tailwind has processed
          collectConfig(root);
          finalizeConfig();

          // Track processed atRules to avoid double processing
          const processedAtRules = new WeakSet();

          // Process media queries
          root.walkAtRules("media", (atRule) => {
            if (processedAtRules.has(atRule)) return;
            
            const { isNested, hasNestedMedia } = getNestedStructure(atRule);
            
            // MARK: Nested MQ
            // If this media query contains nested media queries
            if (hasNestedMedia) {
              atRule.walkAtRules("media", (nestedAtRule) => {
                processedAtRules.add(nestedAtRule);
                processMediaQuery(nestedAtRule, atRule);
              });
            }
            // If this media query is nested inside another
            else if (isNested) {
              // Skip - it will be processed by its parent
              return;
            }
            // Single media query
            else {
              processMediaQuery(atRule);
            }
          });

          // Process container queries
          root.walkAtRules("container", (atRule) => {
            if (processedAtRules.has(atRule)) return;
            
            const { isNested, hasNestedMedia } = getNestedStructure(atRule);
            
            // MARK: Nested CQ
            // If this container query contains nested container queries
            if (hasNestedMedia) {
              atRule.walkAtRules("container", (nestedAtRule) => {
                processedAtRules.add(nestedAtRule);
                processContainerQuery(nestedAtRule, atRule);
              });
            }
            // If this container query is nested inside another
            else if (isNested) {
              // Skip - it will be processed by its parent
              return;
            }
            // Single container query
            else {
              processContainerQuery(atRule);
            }
          });

          // MARK: No MQ or CQ
          root.walkRules((rule) => {
            // Skip if inside a media or container query (they were already processed)
            let parent = rule.parent;
            while (parent) {
              if (
                parent.type === "atrule" &&
                (parent.name === "media" || parent.name === "container")
              ) {
                return; // Skip this rule, it's inside a media/container query
              }
              parent = parent.parent;
            }

            // Find and process clamp declarations
            const clampDecls = [];
            rule.walkDecls((decl) => {
              if (extractTwoValidClampArgs(decl.value)) {
                clampDecls.push(decl);
              }
            });

            if (clampDecls.length === 0) return;

            const screenValues = Object.values(screens);
            const minScreen = defaultClampRange.min || screenValues[0];
            const maxScreen =
              defaultClampRange.max || screenValues[screenValues.length - 1];

            clampDecls.forEach((decl) => {
              processClampDeclaration(decl, minScreen, maxScreen, false);
            });
          });
        },
      };
    },
  };
};

clampwind.postcss = true;

export default clampwind;