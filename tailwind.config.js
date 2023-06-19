/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    screens: {
      'sm': {"max" : '375px'},

      'md0' : {"min" : '378px'},

      'md1' : {"max" : '668px'},

      'md': {"max" : '768px'},

      'lg': {"min" : '769px'},

      'xl': {"max" : '1280px'},
    
      '2xl': {"max" : '1536px'},
    },
    extend: {
      colors:{
        'primary-black' : "#0b0d17",
        'primary-white' : "#d0d6f9",
        'active-white' : "#ffffff"
      },
      backgroundImage :{
        'home-desktop': "url(./assets/home/background-home-desktop.jpg)",
        'home-tablet' : "url(./assets/home/background-home-tablet.jpg)",
        'home-mobile' : "url(./assets/home/background-home-desktop.jpg)",
        'destination-desktop' : "url(./assets/destination/background-destination-desktop.jpg)",
        'destination-tablet' : "url(./assets/destination/background-destination-tablet.jpg)",
        'destination-mobile' : "url(./assets/destination/background-destination-mobile.jpg)",
        'crew-desktop' : "url(./assets/crew/background-crew-desktop.jpg)",
        'crew-tablet' : "url(./assets/crew/background-crew-tablet.jpg)",
        'crew-mobile' : "url(./assets/crew/background-crew-mobile.jpg)",
        'technology-desktop' : "url(./assets/technology/background-technology-desktop.jpg)",
        'technology-tablet' : "url(./assets/technology/background-technology-tablet.jpg)",
        'technology-mobile' : "url(./assets/technology/background-technology-mobile.jpg)"
      },
      fontFamily:{
        'Barlow' : "Barlow Condensed",
        'Bellefair' : "Bellefair"
      }
    },
  },
  plugins: [],
}

