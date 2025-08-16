/**
 * Smart rounding function that removes unnecessary decimal places
 * @param {number} value - The value to round
 * @param {number} maxDecimals - Maximum decimal places (default: 4)
 * @returns {string} The rounded value as a string
 */
const smartRound = (value, maxDecimals = 4) => {
  // Convert to string with max precision first
  const precise = value.toFixed(maxDecimals);
  
  // Remove trailing zeros after decimal point
  const trimmed = precise.replace(/\.?0+$/, '');
  
  // If we removed everything after decimal, return the integer part
  return trimmed || '0';
};

/**
 * Extract two clamp args from a string
 * @param {string} value - The value to extract the clamp args from
 * @returns {Array<string>} The lower and upper clamp args
 */
const extractTwoValidClampArgs = (value) => {
  const m = value.match(/\bclamp\s*\(\s*(var\([^()]+\)|[^,()]+)\s*,\s*(var\([^()]+\)|[^,()]+)\s*\)$/);
  return m ? [m[1].trim(), m[2].trim()] : null;
};

/**
 * Extract the unit from a value
 * @param {string} value - The value to extract the unit from
 * @returns {string|null} The unit or null if no unit found
 */
const extractUnit = (value) => {
  const trimmedValue = value.replace(/\s+/g, '');
  if (trimmedValue.includes('--')) {
    const match = trimmedValue.replace(/var\(([^,)]+)[^)]*\)/, '$1');
    return match ? match : null;
  } else {
    const match = trimmedValue.match(/\D+$/);
    return match ? match[0] : null;
  }
};

/**
 * Format a property value
 * @param {string} value - The value to format
 * @returns {string} The formatted value
 */
const formatProperty = (value) => {
  const trimmedValue = value.replace(/\s+/g, '');
  return trimmedValue.replace(/var\(([^,)]+)[^)]*\)/, '$1');
};

/**
 * Convert a value to rem if px or has unit, otherwise return value
 * If the value is a custom property, it will be converted to the value of the custom property
 * @param {string} value - The value to convert to rem
 * @param {number} rootFontSize - The root font size
 * @param {string} spacingSize - The spacing size
 * @param {Object} customProperties - The custom properties
 * @returns {string} The converted value
 */
const convertToRem = (value, rootFontSize, spacingSize, customProperties = {}) => {
  const unit = extractUnit(value);
  const formattedProperty = formatProperty(value);
  const fallbackValue = value.includes('var(') && value.includes(',') ? value.replace(/var\([^,]+,\s*([^)]+)\)/, '$1') : null;

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

/**
 * Generate a clamp function
 * @param {string} lower - The lower clamp arg
 * @param {string} upper - The upper clamp arg
 * @param {string} minScreen - The minimum screen size
 * @param {string} maxScreen - The maximum screen size
 * @param {number} rootFontSize - The root font size
 * @param {string} spacingSize - The spacing size
 * @param {boolean} containerQuery - Whether to use container queries
 * @returns {string} The generated clamp function,
 */
const generateClamp = (
  lower,
  upper,
  minScreen,
  maxScreen,
  rootFontSize = 16,
  spacingSize = "1px",
  containerQuery = false
) => {
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

/**
 * Convert and sort the screens
 * @param {Object} screens - The base screens object
 * @returns {Object} The sorted screens
 */
const sortScreens = (screens) => {

  // Sort by rem values
  const sortedKeys = Object.keys(screens).sort((a, b) => {
    const aValue = parseFloat(screens[a]);
    const bValue = parseFloat(screens[b]);
    return aValue - bValue;
  });

  // Create new object with sorted keys
  return sortedKeys.reduce((acc, key) => {
    acc[key] = screens[key];
    return acc;
  }, {});
};

export { extractTwoValidClampArgs, convertToRem, generateClamp, sortScreens };