/**
 * Default screen breakpoints 
 * defined by the PostCSS plugin
 */
const defaultScreens = {
  sm: '40rem',  // 640px
  md: '48rem',  // 768px
  lg: '64rem',  // 1024px
  xl: '80rem',  // 1280px
  '2xl': '96rem' // 1536px
};

const defaultContainerScreens = {
  '@3xs': '16rem',  // 256px
  '@2xs': '18rem',  // 288px
  '@xs': '20rem',  // 320px
  '@sm': '24rem',  // 384px
  '@md': '28rem',  // 448px
  '@lg': '32rem',  // 512px
  '@xl': '36rem',  // 576px
  '@2xl': '42rem',  // 672px
  '@3xl': '48rem',  // 768px
  '@4xl': '56rem',  // 896px
  '@5xl': '64rem',  // 1024px
  '@6xl': '72rem',  // 1152px
  '@7xl': '80rem'  // 1280px
};

export {
  defaultScreens,
  defaultContainerScreens
};
