import { defaultScreens, defaultContainerScreens } from "./screens.js";
import {
  extractTwoValidClampArgs,
  convertToRem,
  generateClamp,
  sortScreens,
} from "./utils.js";

const clampwind = (opts = {}) => {
  return {
    postcssPlugin: "clampwind",
    prepare() {
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
          console.warn("Invalid clamp() values", { node: decl });
          decl.value = ` ${decl.value} /* Invalid clamp() values */`;
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

      return {
        // Use OnceExit to ensure Tailwind has generated its content
        OnceExit(root, { result }) {
          // Collect all configuration after Tailwind has processed
          collectConfig(root);
          finalizeConfig();

          // Process media queries
          root.walkAtRules("media", (atRule) => {

            // Find all clamp declarations
            const clampDecls = [];
            atRule.walkDecls((decl) => {
              if (extractTwoValidClampArgs(decl.value)) {
                clampDecls.push(decl);
              }
            });

            if (!clampDecls.length) return;

            clampDecls.forEach((decl) => {
              const isNested =
                decl.parent?.type === "atrule" &&
                decl.parent?.parent.type === "atrule";
              const isSameAtRule =
                decl.parent?.name === decl.parent?.parent.name;

              // MARK: Double MQ
              if (isNested && isSameAtRule) {
                const currentParams = decl.parent.params;
                const parentParams = decl.parent.parent.params;

                let minScreen = null;
                let maxScreen = null;

                // Extract min from >= conditions or min-width
                if (parentParams.includes(">") || parentParams.includes("min-width")) {
                  let match = parentParams.match(/>=?\s*([^),\s]+)/);
                  if (match) {
                    minScreen = match[1].trim();
                  } else {
                    match = parentParams.match(/min-width:\s*([^),\s]+)/);
                    if (match) minScreen = match[1].trim();
                  }
                }
                if (!minScreen && (currentParams.includes(">") || currentParams.includes("min-width"))) {
                  let match = currentParams.match(/>=?\s*([^),\s]+)/);
                  if (match) {
                    minScreen = match[1].trim();
                  } else {
                    match = currentParams.match(/min-width:\s*([^),\s]+)/);
                    if (match) minScreen = match[1].trim();
                  }
                }

                // Extract max from < conditions or max-width
                if (parentParams.includes("<") || parentParams.includes("max-width")) {
                  let match = parentParams.match(/<\s*([^),\s]+)/);
                  if (match) {
                    maxScreen = match[1].trim();
                  } else {
                    match = parentParams.match(/max-width:\s*([^),\s]+)/);
                    if (match) maxScreen = match[1].trim();
                  }
                }
                if (!maxScreen && (currentParams.includes("<") || currentParams.includes("max-width"))) {
                  let match = currentParams.match(/<\s*([^),\s]+)/);
                  if (match) {
                    maxScreen = match[1].trim();
                  } else {
                    match = currentParams.match(/max-width:\s*([^),\s]+)/);
                    if (match) maxScreen = match[1].trim();
                  }
                }

                if (minScreen && maxScreen) {
                  clampDecls.forEach((decl) => {
                    processClampDeclaration(decl, minScreen, maxScreen, false);
                  });
                }
                return;
              }

              // Handle invalid nesting
              if (isNested && !isSameAtRule) {
                clampDecls.forEach((decl) => {
                  decl.value = ` ${decl.value} /* Invalid nested @media rules */`;
                });
                return;
              }

              // MARK: Single MQ
              const screenValues = Object.values(screens);
              const currentParams = decl.parent.params;

              // Upper breakpoints (>= syntax or min-width)
              if (currentParams.includes(">") || currentParams.includes("min-width")) {
                let match = currentParams.match(/>=?\s*([^),\s]+)/);
                if (!match) {
                  match = currentParams.match(/min-width:\s*([^),\s]+)/);
                }
                
                if (match) {
                  const minScreen = match[1].trim();
                  const maxScreen = 
                    defaultClampRange.max || 
                    screenValues[screenValues.length - 1];
                  processClampDeclaration(decl, minScreen, maxScreen, false);
                }
              }
              // Lower breakpoints (< syntax or max-width)
              else if (currentParams.includes("<") || currentParams.includes("max-width")) {
                let match = currentParams.match(/<\s*([^),\s]+)/);
                if (!match) {
                  match = currentParams.match(/max-width:\s*([^),\s]+)/);
                }
                
                if (match) {
                  const minScreen = defaultClampRange.min || screenValues[0];
                  const maxScreen = match[1].trim();
                  processClampDeclaration(decl, minScreen, maxScreen, false);
                }
              }
            });
          });

          // Process container queries
          root.walkAtRules("container", (atRule) => {
            // Find all clamp declarations
            const clampDecls = [];
            atRule.walkDecls((decl) => {
              if (extractTwoValidClampArgs(decl.value)) {
                clampDecls.push(decl);
              }
            });

            if (!clampDecls.length) return;

            clampDecls.forEach((decl) => {
              const isNested =
                decl.parent?.type === "atrule" &&
                decl.parent?.parent.type === "atrule";
              const isSameAtRule =
                decl.parent?.name === decl.parent?.parent.name;

              // MARK: Double CQ
              if (isNested && isSameAtRule) {
                const currentParams = decl.parent.params;
                const parentParams = decl.parent.parent.params;

                let minContainer = null;
                let maxContainer = null;

                // Extract min from >= conditions or min-width
                if (parentParams.includes(">") || parentParams.includes("min-width")) {
                  let match = parentParams.match(/>=?\s*([^),\s]+)/);
                  if (!match) {
                    match = parentParams.match(/min-width:\s*([^),\s]+)/);
                  }
                  if (match) minContainer = match[1].trim();
                }
                if (!minContainer && (currentParams.includes(">") || currentParams.includes("min-width"))) {
                  let match = currentParams.match(/>=?\s*([^),\s]+)/);
                  if (!match) {
                    match = currentParams.match(/min-width:\s*([^),\s]+)/);
                  }
                  if (match) minContainer = match[1].trim();
                }

                // Extract max from < conditions or max-width
                if (parentParams.includes("<") || parentParams.includes("max-width")) {
                  let match = parentParams.match(/<\s*([^),\s]+)/);
                  if (!match) {
                    match = parentParams.match(/max-width:\s*([^),\s]+)/);
                  }
                  if (match) maxContainer = match[1].trim();
                }
                if (!maxContainer && (currentParams.includes("<") || currentParams.includes("max-width"))) {
                  let match = currentParams.match(/<\s*([^),\s]+)/);
                  if (!match) {
                    match = currentParams.match(/max-width:\s*([^),\s]+)/);
                  }
                  if (match) maxContainer = match[1].trim();
                }

                if (minContainer && maxContainer) {
                  clampDecls.forEach((decl) => {
                    processClampDeclaration(
                      decl,
                      minContainer,
                      maxContainer,
                      true
                    );
                  });
                }
                return;
              }

              // Handle invalid nesting
              if (isNested && !isSameAtRule) {
                clampDecls.forEach((decl) => {
                  decl.value = ` ${decl.value} /* Invalid nested @container rules */`;
                });
                return;
              }

              // MARK: Single CQ
              const containerValues = Object.values(containerScreens);
              const currentParams = decl.parent.params;

              // Upper breakpoints (>= syntax or min-width)
              if (currentParams.includes(">") || currentParams.includes("min-width")) {
                let match = currentParams.match(/>=?\s*([^),\s]+)/);
                if (!match) {
                  match = currentParams.match(/min-width:\s*([^),\s]+)/);
                }
                
                if (match) {
                  const minContainer = match[1].trim();
                  const maxContainer = 
                    containerValues[containerValues.length - 1];
                  processClampDeclaration(
                    decl,
                    minContainer,
                    maxContainer,
                    true
                  );
                }
              }
              // Lower breakpoints (< syntax or max-width)
              else if (currentParams.includes("<") || currentParams.includes("max-width")) {
                let match = currentParams.match(/<\s*([^),\s]+)/);
                if (!match) {
                  match = currentParams.match(/max-width:\s*([^),\s]+)/);
                }
                
                if (match) {
                  const minContainer = containerValues[0];
                  const maxContainer = match[1].trim();
                  processClampDeclaration(
                    decl,
                    minContainer,
                    maxContainer,
                    true
                  );
                }
              }
            });
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