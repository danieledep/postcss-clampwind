// src/screens.js
var defaultScreens = {
  sm: "40rem",
  // 640px
  md: "48rem",
  // 768px
  lg: "64rem",
  // 1024px
  xl: "80rem",
  // 1280px
  "2xl": "96rem"
  // 1536px
};
var defaultContainerScreens = {
  "@3xs": "16rem",
  // 256px
  "@2xs": "18rem",
  // 288px
  "@xs": "20rem",
  // 320px
  "@sm": "24rem",
  // 384px
  "@md": "28rem",
  // 448px
  "@lg": "32rem",
  // 512px
  "@xl": "36rem",
  // 576px
  "@2xl": "42rem",
  // 672px
  "@3xl": "48rem",
  // 768px
  "@4xl": "56rem",
  // 896px
  "@5xl": "64rem",
  // 1024px
  "@6xl": "72rem",
  // 1152px
  "@7xl": "80rem"
  // 1280px
};

// src/utils.js
var smartRound = (value, maxDecimals = 4) => {
  const precise = value.toFixed(maxDecimals);
  const trimmed = precise.replace(/\.?0+$/, "");
  return trimmed || "0";
};
var extractTwoValidClampArgs = (value) => {
  const m = value.match(/\bclamp\s*\(\s*(var\([^()]+\)|[^,()]+)\s*,\s*(var\([^()]+\)|[^,()]+)\s*\)$/);
  return m ? [m[1].trim(), m[2].trim()] : null;
};
var extractUnit = (value) => {
  const trimmedValue = value.replace(/\s+/g, "");
  if (trimmedValue.includes("--")) {
    const match = trimmedValue.replace(/var\(([^,)]+)[^)]*\)/, "$1");
    return match ? match : null;
  } else {
    const match = trimmedValue.match(/\D+$/);
    return match ? match[0] : null;
  }
};
var formatProperty = (value) => {
  const trimmedValue = value.replace(/\s+/g, "");
  return trimmedValue.replace(/var\(([^,)]+)[^)]*\)/, "$1");
};
var convertToRem = (value, rootFontSize, spacingSize, customProperties = {}) => {
  const unit = extractUnit(value);
  const formattedProperty = formatProperty(value);
  const fallbackValue = value.includes("var(") && value.includes(",") ? value.replace(/var\([^,]+,\s*([^)]+)\)/, "$1") : null;
  if (!unit) {
    const spacingSizeInt = parseFloat(spacingSize);
    const spacingUnit = extractUnit(spacingSize);
    if (spacingUnit === "px") {
      return `${smartRound(value * spacingSizeInt / rootFontSize)}rem`;
    }
    if (spacingUnit === "rem") {
      return `${smartRound(value * spacingSizeInt)}rem`;
    }
  }
  if (unit === "px") {
    return `${smartRound(value.replace("px", "") / rootFontSize)}rem`;
  }
  if (unit === "rem") {
    return value;
  }
  if (customProperties[formattedProperty]) {
    return customProperties[formattedProperty];
  }
  if (formattedProperty && !customProperties[formattedProperty] && fallbackValue) {
    const fallbackUnit = extractUnit(fallbackValue);
    if (!fallbackUnit) {
      return `${smartRound(fallbackValue * spacingSize)}rem`;
    }
    if (fallbackUnit === "px") {
      return `${smartRound(fallbackValue.replace("px", "") / rootFontSize)}rem`;
    }
    if (fallbackUnit === "rem") {
      return fallbackValue;
    }
  }
  return null;
};
var generateClamp = (lower, upper, minScreen, maxScreen, rootFontSize = 16, spacingSize = "1px", containerQuery = false) => {
  const maxScreenInt = parseFloat(
    convertToRem(maxScreen, rootFontSize, spacingSize)
  );
  const minScreenInt = parseFloat(
    convertToRem(minScreen, rootFontSize, spacingSize)
  );
  const lowerInt = parseFloat(lower);
  const upperInt = parseFloat(upper);
  const isDescending = lowerInt > upperInt;
  const min = isDescending ? upper : lower;
  const max = isDescending ? lower : upper;
  const widthUnit = containerQuery ? `100cqw` : `100vw`;
  const slopeInt = smartRound((upperInt - lowerInt) / (maxScreenInt - minScreenInt));
  const clamp = `clamp(${min}, calc(${lower} + ${slopeInt} * (${widthUnit} - ${minScreen})), ${max})`;
  return clamp;
};
var sortScreens = (screens) => {
  const sortedKeys = Object.keys(screens).sort((a, b) => {
    const aValue = parseFloat(screens[a]);
    const bValue = parseFloat(screens[b]);
    return aValue - bValue;
  });
  return sortedKeys.reduce((acc, key) => {
    acc[key] = screens[key];
    return acc;
  }, {});
};

// src/clampwind.js
var clampwind = (opts = {}) => {
  return {
    postcssPlugin: "clampwind",
    prepare() {
      let rootFontSize = 16;
      let spacingSize = "0.25rem";
      let customProperties = {};
      let screens = defaultScreens || {};
      let containerScreens = defaultContainerScreens || {};
      let defaultClampRange = {};
      const config = {
        themeLayerBreakpoints: {},
        themeLayerContainerBreakpoints: {},
        rootElementBreakpoints: {},
        rootElementContainerBreakpoints: {},
        configCollected: false,
        configReady: false
      };
      const collectConfig = (root) => {
        if (config.configCollected) return;
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
        root.walkAtRules("layer", (atRule) => {
          if (atRule.params === "theme") {
            atRule.walkDecls((decl) => {
              if (decl.prop === "--text-base" && decl.value.includes("px")) {
                rootFontSize = parseFloat(decl.value);
              }
            });
          }
        });
        root.walkAtRules("layer", (atRule) => {
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
      const finalizeConfig = () => {
        if (config.configReady) return;
        screens = Object.assign(
          {},
          screens,
          config.rootElementBreakpoints,
          config.themeLayerBreakpoints
        );
        screens = sortScreens(screens);
        containerScreens = Object.assign(
          {},
          containerScreens,
          config.rootElementContainerBreakpoints,
          config.themeLayerContainerBreakpoints
        );
        containerScreens = sortScreens(containerScreens);
        config.configReady = true;
      };
      const processClampDeclaration = (decl, minScreen, maxScreen, isContainer = false) => {
        const args = extractTwoValidClampArgs(decl.value);
        const [lower, upper] = args.map(
          (val) => convertToRem(val, rootFontSize, spacingSize, customProperties)
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
          collectConfig(root);
          finalizeConfig();
          root.walkAtRules("media", (atRule) => {
            const clampDecls = [];
            atRule.walkDecls((decl) => {
              if (extractTwoValidClampArgs(decl.value)) {
                clampDecls.push(decl);
              }
            });
            if (!clampDecls.length) return;
            clampDecls.forEach((decl) => {
              const isNested = decl.parent?.type === "atrule" && decl.parent?.parent.type === "atrule";
              const isSameAtRule = decl.parent?.name === decl.parent?.parent.name;
              if (isNested && isSameAtRule) {
                const currentParams2 = decl.parent.params;
                const parentParams = decl.parent.parent.params;
                let minScreen = null;
                let maxScreen = null;
                if (parentParams && (parentParams.includes(">") || parentParams.includes("min-width"))) {
                  let match = parentParams.match(/>=?\s*([^),\s]+)/);
                  if (match) {
                    minScreen = match[1].trim();
                  } else {
                    match = parentParams.match(/min-width:\s*([^),\s]+)/);
                    if (match) minScreen = match[1].trim();
                  }
                }
                if (!minScreen && (currentParams2 && (currentParams2.includes(">") || currentParams2.includes("min-width")))) {
                  let match = currentParams2.match(/>=?\s*([^),\s]+)/);
                  if (match) {
                    minScreen = match[1].trim();
                  } else {
                    match = currentParams2.match(/min-width:\s*([^),\s]+)/);
                    if (match) minScreen = match[1].trim();
                  }
                }
                if (parentParams && (parentParams.includes("<") || parentParams.includes("max-width"))) {
                  let match = parentParams.match(/<\s*([^),\s]+)/);
                  if (match) {
                    maxScreen = match[1].trim();
                  } else {
                    match = parentParams.match(/max-width:\s*([^),\s]+)/);
                    if (match) maxScreen = match[1].trim();
                  }
                }
                if (!maxScreen && (currentParams2 && (currentParams2.includes("<") || currentParams2.includes("max-width")))) {
                  let match = currentParams2.match(/<\s*([^),\s]+)/);
                  if (match) {
                    maxScreen = match[1].trim();
                  } else {
                    match = currentParams2.match(/max-width:\s*([^),\s]+)/);
                    if (match) maxScreen = match[1].trim();
                  }
                }
                if (minScreen && maxScreen) {
                  clampDecls.forEach((decl2) => {
                    processClampDeclaration(decl2, minScreen, maxScreen, false);
                  });
                }
                return;
              }
              if (isNested && !isSameAtRule) {
                clampDecls.forEach((decl2) => {
                  decl2.value = ` ${decl2.value} /* Invalid nested @media rules */`;
                });
                return;
              }
              const screenValues = Object.values(screens);
              const currentParams = decl.parent.params;
              if (currentParams && (currentParams.includes(">") || currentParams.includes("min-width"))) {
                let match = currentParams.match(/>=?\s*([^),\s]+)/);
                if (!match) {
                  match = currentParams.match(/min-width:\s*([^),\s]+)/);
                }
                if (match) {
                  const minScreen = match[1].trim();
                  const maxScreen = defaultClampRange.max || screenValues[screenValues.length - 1];
                  processClampDeclaration(decl, minScreen, maxScreen, false);
                }
              } else if (currentParams && (currentParams.includes("<") || currentParams.includes("max-width"))) {
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
          root.walkAtRules("container", (atRule) => {
            const clampDecls = [];
            atRule.walkDecls((decl) => {
              if (extractTwoValidClampArgs(decl.value)) {
                clampDecls.push(decl);
              }
            });
            if (!clampDecls.length) return;
            clampDecls.forEach((decl) => {
              const isNested = decl.parent?.type === "atrule" && decl.parent?.parent.type === "atrule";
              const isSameAtRule = decl.parent?.name === decl.parent?.parent.name;
              if (isNested && isSameAtRule) {
                const currentParams2 = decl.parent.params;
                const parentParams = decl.parent.parent.params;
                let minContainer = null;
                let maxContainer = null;
                if (parentParams && (parentParams.includes(">") || parentParams.includes("min-width"))) {
                  let match = parentParams.match(/>=?\s*([^),\s]+)/);
                  if (!match) {
                    match = parentParams.match(/min-width:\s*([^),\s]+)/);
                  }
                  if (match) minContainer = match[1].trim();
                }
                if (!minContainer && (currentParams2 && (currentParams2.includes(">") || currentParams2.includes("min-width")))) {
                  let match = currentParams2.match(/>=?\s*([^),\s]+)/);
                  if (!match) {
                    match = currentParams2.match(/min-width:\s*([^),\s]+)/);
                  }
                  if (match) minContainer = match[1].trim();
                }
                if (parentParams && (parentParams.includes("<") || parentParams.includes("max-width"))) {
                  let match = parentParams.match(/<\s*([^),\s]+)/);
                  if (!match) {
                    match = parentParams.match(/max-width:\s*([^),\s]+)/);
                  }
                  if (match) maxContainer = match[1].trim();
                }
                if (!maxContainer && (currentParams2 && (currentParams2.includes("<") || currentParams2.includes("max-width")))) {
                  let match = currentParams2.match(/<\s*([^),\s]+)/);
                  if (!match) {
                    match = currentParams2.match(/max-width:\s*([^),\s]+)/);
                  }
                  if (match) maxContainer = match[1].trim();
                }
                if (minContainer && maxContainer) {
                  clampDecls.forEach((decl2) => {
                    processClampDeclaration(
                      decl2,
                      minContainer,
                      maxContainer,
                      true
                    );
                  });
                }
                return;
              }
              if (isNested && !isSameAtRule) {
                clampDecls.forEach((decl2) => {
                  decl2.value = ` ${decl2.value} /* Invalid nested @container rules */`;
                });
                return;
              }
              const containerValues = Object.values(containerScreens);
              const currentParams = decl.parent.params;
              if (currentParams && (currentParams.includes(">") || currentParams.includes("min-width"))) {
                let match = currentParams.match(/>=?\s*([^),\s]+)/);
                if (!match) {
                  match = currentParams.match(/min-width:\s*([^),\s]+)/);
                }
                if (match) {
                  const minContainer = match[1].trim();
                  const maxContainer = containerValues[containerValues.length - 1];
                  processClampDeclaration(
                    decl,
                    minContainer,
                    maxContainer,
                    true
                  );
                }
              } else if (currentParams && (currentParams.includes("<") || currentParams.includes("max-width"))) {
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
          root.walkRules((rule) => {
            let parent = rule.parent;
            while (parent) {
              if (parent.type === "atrule" && (parent.name === "media" || parent.name === "container")) {
                return;
              }
              parent = parent.parent;
            }
            const clampDecls = [];
            rule.walkDecls((decl) => {
              if (extractTwoValidClampArgs(decl.value)) {
                clampDecls.push(decl);
              }
            });
            if (clampDecls.length === 0) return;
            const screenValues = Object.values(screens);
            const minScreen = defaultClampRange.min || screenValues[0];
            const maxScreen = defaultClampRange.max || screenValues[screenValues.length - 1];
            clampDecls.forEach((decl) => {
              processClampDeclaration(decl, minScreen, maxScreen, false);
            });
          });
        }
      };
    }
  };
};
clampwind.postcss = true;
var clampwind_default = clampwind;
export {
  clampwind_default as default
};
