export default function mapImageFilenamesToUrls(yacht, req) {
  const mapFields = (item) => {
    // Flatten translations.en fields to top level for backward compatibility with admin panel
    // Admin panel expects title, slug, tags, etc. at top level
    const enTranslations = item?.translations?.en || {};
    
    return {
      ...item,
      primaryImage: item.primaryImage || null,
      galleryImages: (item.galleryImages || []),
      // Flatten translations.en fields to top level for backward compatibility
      title: item.title || enTranslations.title || '',
      slug: item.slug || enTranslations.slug || '',
      dayCharter: item.dayCharter || enTranslations.dayCharter || '',
      overnightCharter: item.overnightCharter || enTranslations.overnightCharter || '',
      aboutThisBoat: item.aboutThisBoat || enTranslations.aboutThisBoat || '',
      specifications: item.specifications || enTranslations.specifications || '',
      boatLayout: item.boatLayout || enTranslations.boatLayout || '',
      tags: item.tags || enTranslations.tags || [],
    };
  };
  if (Array.isArray(yacht)) {
    return yacht.map(mapFields);
  } else {
    return mapFields(yacht);
  }
}