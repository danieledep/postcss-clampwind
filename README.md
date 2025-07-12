# clampwind

A PostCSS plugin that transforms any two‑argument `clamp()` call into a fully fluid value, seamlessly integrating with Tailwind CSS utilities. Made for Tailwind v4.

## How it works

Instead of the standard three-value `clamp(min, preferred, max)`, you supply just a minimum and maximum:

```html
<div class="text-[clamp(16px,50px)]"></div>
```

This will generate the following CSS:

```css
.text-\[clamp\(16px\,50px\)\] {
  @media (width < 40rem) { /* < 640px */
    font-size: 1rem;
  }
  @media (width >= 40rem) { /* >= 640px */
    @media (width < 96rem) { /* < 1536px */
      font-size: clamp(1rem, calc(1rem + 0.0379 * (100vw - 40rem)), 3.125rem);
    }
  }
  @media (width >= 96rem) { /* >= 1536px */
    font-size: 3.125rem;
  }
}
```

The supplied values are used to generate the expression inside the `clamp()` function, where the slope and bounds of the fluid transformation are calculated using Tailwind's smallest and largest breakpoints. 

The plugin will also generate the css for any screen size outside of the range of the smallest and largest breakpoints.


## Installation

Install the plugin from npm:

```sh
npm install -D clampwind
```

### PostCSS setup

Add the plugin to your `postcss.config.js` file:

```js
// postcss.config.js
export default { 
  plugins: { 
    "@tailwindcss/postcss": {},
    "clampwind": {}
  } 
};

```

### Vite project setup

If you are using Vite, you are probably using Tailwind with `@tailwindcss/vite`. 

Vite will automatically detect the `postcss.config.js` file and use the plugin, without the need to explicitly define it in `vite.config.js`. So you just need to have `postcss.config.js` in your root folder.

```js
// postcss.config.js
export default { 
  plugins: { 
    "clampwind": {}
  } 
};

```

## Features

### Interchangeable px / rem units

Allow clamped values to use either px or rem interchangeably.

```html
<div class="text-[clamp(1rem,50px)]"></div>
```

### Use Tailwind breakpoint modifiers

Use the native Tailwind syntax to clamp values within a specific range by using breakpoint modifiers.

```html
<div class="md:max-lg:text-[clamp(16px,50px)]"></div>
```
### Unitless clamping

If no unit is specified, default to your theme’s `--spacing` scale.

```html
<div class="text-[clamp(16,50)]"></div>
```

### Use Tailwind size variables

Clamp using Tailwind’s predefined size tokens.

```html
<div class="text-[clamp(var(--text-sm),50px)]"></div>
```

### Use CSS custom properties

Clamp using CSS custom properties.

```html
<div class="text-[clamp(var(--custom-value),50px)]"></div>
```

### Container query support

Clamp values based on container query breakpoints.

```html
<div class="@md:text-[clamp(16px,50px)]"></div>
```

### Decreasing and negative ranges

Support clamped ranges that shrink or go below zero.

```html
<div class="text-[clamp(50px,16px)]"></div>
```

### Error reporting via CSS comments

Output validation errors as CSS comments for easy debugging.

```css
.text-\[clamp\(16%\,50px\)\] {
  font-size: clamp(16%,50px); /* Invalid clamp() values */
}
```


## Usage

To use this plugin you need to use the `clamp()` function but with **only two arguments**, the first one is the minimum value and the second one is the maximum value.

### Clamp between smallest and largest breakpoint

Write the Tailwind utility you want to make fluid, without any breakpoint modifier, for example:

```html
<div class="text-[clamp(16px,50px)]"></div>
```

This will use Tailwind default largest and smallest breakpoint.

```css
.text-\[clamp\(16px\,50px\)\] {
  @media (width >= 40rem) { /* 640px */
    @media (width < 96rem) { /* 1536px */
      font-size: clamp(1rem, calc(...) , 3.125rem);
    }
  }
}
```

But clampwind also generates automatically the css values for any screen size outside of the range of the smallest and largest breakpoints. The full generated css will be:

```css
.text-\[clamp\(16px\,50px\)\] {
    @media (width < 40rem) { /* 640px */
      font-size: 1rem;
    }
    @media (width >= 40rem) { /* 640px */
      @media (width < 96rem) { /* 1536px */
        font-size: clamp(1rem, calc(...), 3.125rem);
      }
    }
    @media (width >= 96rem) { /* 1536px */
      font-size: 3.125rem;
    }
  }
```

### Clamp between two breakpoints

Simply add regular Tailwind breakpoint modifiers to the utility, for example:

```html
<div class="md:max-lg:text-[clamp(16px,50px)]"></div>
```

To clamp the CSS property between the two breakpoints you need to use the `max-` modifier, in this case the CSS property will be clamped between the `md` and `lg` breakpoints.

This will generate the following css:

```css
.md\:max-lg\:text-\[clamp\(16px\,50px\)\] {
  @media (width >= 48rem) { /* 768px */
    @media (width < 64rem) { /* 1024px */
      font-size: clamp(1rem, calc(...), 3.125rem);
    }
  }
}
```

> If you explicitly set a range of breakpoints, clampwind will not generate the outer breakpoints.

### Clamp from one breakpoint

If you want to define a clamp value from a single breakpoint, clampwind will automatically generate the css for the largest breakpoint and above, or the smallest breakpoint and below if you use the `max-` modifier, for example:

```html
<div class="md:text-[clamp(16px,50px)]"></div>
```

This will generate the following css:

```css
.md\:text-\[clamp\(16px\,50px\)\] {
    @media (width >= 48rem) {  /* 768px */
      @media (width < 96rem) { /* 1536px */
        font-size: clamp(1rem, calc(...), 3.125rem);
      }
    }
    @media (width >= 96rem) {
      font-size: 3.125rem;
    }
  }
```
Or if you use the `max-` modifier:

```css
.max-md\:text-\[clamp\(16px\,50px\)\] {
    @media (width < 40rem) { /* 640px */
      font-size: 1rem;
    }
    @media (width >= 40rem) { /* 640px */
      @media (width < 48rem) { /* 768px */
        font-size: clamp(1rem, calc(...), 3.125rem);
      }
    }
  }
```

### Clamp between custom breakpoints

With Tailwind v4 it's really easy to use one-time custom breakpoints, and this plugin will automatically detect them and use them to clamp the CSS property.

```html
<div class="min-[1000px]:max-xl:text-[clamp(16px,50px)]"></div>
```

This will generate the following css:

```css
.min-\[1000px\]\:max-xl\:text-\[clamp\(16px\,50px\)\] {
  @media (width >= 1000px) { /* 1000px */
    @media (width < 64rem) { /* 1600px */
      font-size: clamp(1rem, calc(...), 3.125rem);
    }
  }
}
```

### Clamp between Tailwind spacing scale values

A quick way to define two clamped values is to use the Tailwind spacing scale values, for example:

```html
<div class="text-[clamp(16,50)]"></div>
```

The bare values size depends on the theme `--spacing` size, so if you have have it set to `1px` it will generate the following css:

```css
.text-\[clamp\(16\,50\)\] {
  @media (width >= 40rem) { /* 640px */
    @media (width < 96rem) { /* 1536px */
      font-size: clamp(1rem, calc(...), 3.125rem);
    }
  }
}
```

### Clamp custom properties values

You can also use custom properties in your clamped values, for example like this:

```html
<div class="text-[clamp(var(--text-sm),50px)]"></div>
```
or like this:

```html
<div class="text-[clamp(--text-sm,--text-lg)]"></div>
```

But this won't work when using two custom properties directly in the CSS with `@apply`, so you need to use the `var()` function instead.

```css
.h2 {
  @apply text-[clamp(var(--text-sm),var(--text-lg))];
}
```



### Clamp container queries

Clampwind supports container queries, just by using the normal Tailwind container query syntax, for example:

```html
<div class="@md:text-[clamp(16px,50px)]"></div>
```

This will generate the following css:

```css
.@md\:text-\[clamp\(16px\,50px\)\] {
  @container (width >= 28rem) { /* 448px */
    @container (width < 80rem) { /* 1280px */
      font-size: clamp(1rem, calc(...), 3.125rem);
    }
  }
  @container (width >= 80rem) { /* 1280px */
    font-size: 3.125rem;
  }
}
```

## Configuration

Tailwind v4 introduced the new CSS-based configuration and clampwind embraces it.

### Add custom breakpoints

To add new breakpoints in Tailwind v4 you normally define them inside the `@theme` directive.

But Tailwind by default, will not output in your CSS any custom properties that are not referenced in your CSS, for this reason you should use the `@theme static` directive instead of `@theme` to create custom breakpoints.

```css
@theme static {
  --breakpoint-4xl: 1600px;
}
```

### Use custom properties

You can use any custom properties in your clamped values, for example:

```html
<div class="text-[clamp(--custom-value,50px)]"></div>
```

You just need to make sure that the custom property is defined in your `:root` selector.

```css
:root {
  --custom-value: 16px;
}
```

### Pixel to rem conversion

If you are using pixel values in your clamped values, clampwind will automatically convert them to rem. For the conversion it scans your generated css and if you have set pixel values for the root `font-size` or for your `--text-base` custom property in your `:root` selector, it will use that value to convert the pixel values to rem values. If you haven't set a font-size in your `:root` selector, it will use the default value of 16px.

```css
:root {
  font-size: 18px; /* 18px = 1.125rem */
}
```
or like this:

```css
:root {
  --text-base: 18px; /* 18px = 1.125rem */
}
```

## License and Credits

This project is licensed under the [Apache-2.0 license](https://apache.org/licenses/LICENSE-2.0).

Copyright © 2025 Daniele De Pietri.