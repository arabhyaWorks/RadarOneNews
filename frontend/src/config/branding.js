// Branding config — override any value via .env for each client deployment.
// All REACT_APP_* vars are set at build time.

const branding = {
  name:         process.env.REACT_APP_BRAND_NAME         || 'Samachar Group',
  nameHi:       process.env.REACT_APP_BRAND_NAME_HI      || 'समाचार ग्रुप',
  tagline:      process.env.REACT_APP_BRAND_TAGLINE       || "India's Trusted News Platform",
  taglineHi:    process.env.REACT_APP_BRAND_TAGLINE_HI   || 'भारत का विश्वसनीय न्यूज़ प्लेटफ़ॉर्म',
  description:  process.env.REACT_APP_BRAND_DESCRIPTION  || 'Breaking news, politics, sports, business, and entertainment.',
  descriptionHi:process.env.REACT_APP_BRAND_DESCRIPTION_HI || 'ताज़ा खबरें, राजनीति, खेल, व्यापार और मनोरंजन।',
  email:        process.env.REACT_APP_BRAND_EMAIL        || 'news@samachargroup.in',
  phone:        process.env.REACT_APP_BRAND_PHONE        || '+91 9876 543 210',
  address:      process.env.REACT_APP_BRAND_ADDRESS      || 'Lucknow, Uttar Pradesh, India',
  addressHi:    process.env.REACT_APP_BRAND_ADDRESS_HI   || 'लखनऊ, उत्तर प्रदेश, भारत',
};

export default branding;