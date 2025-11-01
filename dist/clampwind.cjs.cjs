var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/clampwind.js
var clampwind_exports = {};
__export(clampwind_exports, {
  default: () => clampwind_default
});
module.exports = __toCommonJS(clampwind_exports);

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
var extractMaxValue = (params) => {
  if (!params) return null;
  let match = params.match(/<\s*([^),\s]+)/);
  if (match) return match[1].trim();
  match = params.match(/max-width:\s*([^),\s]+)/);
  if (match) return match[1].trim();
  match = params.match(/not\s+all\s+and\s*\(\s*min-width:\s*([^),\s]+)\s*\)/);
  if (match) return match[1].trim();
  return null;
};
var extractMinValue = (params) => {
  if (!params) return null;
  let match = params.match(/>=?\s*([^),\s]+)/);
  if (match) return match[1].trim();
  match = params.match(/min-width:\s*([^),\s]+)/);
  if (match) return match[1].trim();
  match = params.match(/not\s+all\s+and\s*\(\s*max-width:\s*([^),\s]+)\s*\)/);
  if (match) {
    return match[1].trim();
  }
  return null;
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
      const getNestedStructure = (atRule) => {
        const isNested = atRule.parent?.type === "atrule" && atRule.parent?.name === "media";
        const hasNestedMedia = atRule.nodes?.some(
          (node) => node.type === "atrule" && node.name === "media"
        );
        return { isNested, hasNestedMedia };
      };
      const processMediaQuery = (atRule, parentAtRule = null) => {
        const clampDecls = [];
        atRule.walkDecls((decl) => {
          if (extractTwoValidClampArgs(decl.value)) {
            clampDecls.push(decl);
          }
        });
        if (!clampDecls.length) return;
        const screenValues = Object.values(screens);
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
      const processContainerQuery = (atRule, parentAtRule = null) => {
        const clampDecls = [];
        atRule.walkDecls((decl) => {
          if (extractTwoValidClampArgs(decl.value)) {
            clampDecls.push(decl);
          }
        });
        if (!clampDecls.length) return;
        const containerValues = Object.values(containerScreens);
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
          collectConfig(root);
          finalizeConfig();
          const processedAtRules = /* @__PURE__ */ new WeakSet();
          root.walkAtRules("media", (atRule) => {
            if (processedAtRules.has(atRule)) return;
            const { isNested, hasNestedMedia } = getNestedStructure(atRule);
            if (hasNestedMedia) {
              atRule.walkAtRules("media", (nestedAtRule) => {
                processedAtRules.add(nestedAtRule);
                processMediaQuery(nestedAtRule, atRule);
              });
            } else if (isNested) {
              return;
            } else {
              processMediaQuery(atRule);
            }
          });
          root.walkAtRules("container", (atRule) => {
            if (processedAtRules.has(atRule)) return;
            const { isNested, hasNestedMedia } = getNestedStructure(atRule);
            if (hasNestedMedia) {
              atRule.walkAtRules("container", (nestedAtRule) => {
                processedAtRules.add(nestedAtRule);
                processContainerQuery(nestedAtRule, atRule);
              });
            } else if (isNested) {
              return;
            } else {
              processContainerQuery(atRule);
            }
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
