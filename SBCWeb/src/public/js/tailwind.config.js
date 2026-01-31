// Tailwind Configuration for Dashboard
const tailwindConfig = {
  theme: {
    extend: {
      colors: {
        'ash-grey': {
          50: '#f2f3f1',
          100: '#e6e7e4',
          200: '#ccd0c8',
          300: '#b3b8ad',
          400: '#9aa092',
          500: '#808877',
          600: '#676d5f',
          700: '#4d5247',
          800: '#33372f',
          900: '#1a1b18',
          950: '#121311'
        },
        'silver': {
          50: '#f2f3f2',
          100: '#e5e6e5',
          200: '#cbcdcb',
          300: '#b1b4b1',
          400: '#979b97',
          500: '#7d827d',
          600: '#646864',
          700: '#4b4e4b',
          800: '#323432',
          900: '#191a19',
          950: '#111211'
        },
        'mauve-shadow': {
          50: '#f4f0f3',
          100: '#e9e2e7',
          200: '#d3c5cf',
          300: '#bda8b7',
          400: '#a78ba0',
          500: '#916e88',
          600: '#74586d',
          700: '#574251',
          800: '#3a2c36',
          900: '#1d161b',
          950: '#140f13'
        },
        'vintage-grape': {
          50: '#f3f0f4',
          100: '#e7e2e9',
          200: '#cfc4d4',
          300: '#b7a7be',
          400: '#a08aa8',
          500: '#886c93',
          600: '#6d5775',
          700: '#514158',
          800: '#362b3b',
          900: '#1b161d',
          950: '#130f15'
        },
        'midnight-violet': {
          50: '#f3eff5',
          100: '#e8e0eb',
          200: '#d0c1d7',
          300: '#b9a2c3',
          400: '#a183af',
          500: '#8a639c',
          600: '#6e507c',
          700: '#533c5d',
          800: '#37283e',
          900: '#1c141f',
          950: '#130e16'
        }
      }
    }
  }
};

// Export for use with Tailwind CDN
if (typeof tailwind !== 'undefined') {
  tailwind.config = tailwindConfig;
}
