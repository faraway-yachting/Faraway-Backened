import mongoose from 'mongoose';

const translationSchema = new mongoose.Schema(
  {
    slug: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    title: { type: String, trim: true },
    dayCharter: { type: String },
    overnightCharter: { type: String },
    aboutThisBoat: { type: String },
    specifications: { type: String },
    boatLayout: { type: String },
    tags: [{ type: String, trim: true }],
  },
  { _id: false }
);

const yachtSchema = new mongoose.Schema(
  {
    boatType: { type: String }, // e.g., Power
    price: { type: String }, // e.g., Budget
    capacity: { type: String }, // e.g., Day Charter
    length: { type: String }, // e.g., 35sq
    lengthRange: { type: String },
    title: { type: String }, // e.g., Luxury Yacht (legacy top-level)
    cabins: { type: String }, // e.g., 1
    bathrooms: { type: String }, // e.g., 2
    passengerDayTrip: { type: String }, // e.g., 1
    passengerOvernight: { type: String }, // e.g., 1
    guests: { type: String }, // e.g., 1
    guestsRange: { type: String }, // e.g., ≤6
    dayTripPrice: { type: String }, // e.g., 30,000 DTP
    overnightPrice: { type: String }, // e.g., 30,000 OP
    daytripPriceEuro: { type: String }, // e.g., 800 EUR
    primaryImage: { type: String }, // Single image filename/URL
    galleryImages: [String], // Multiple image filenames/URLs
    dayCharter: { type: String }, // Rich text (HTML/Markdown) - legacy top-level
    overnightCharter: { type: String }, // Rich text (HTML/Markdown) - legacy top-level
    aboutThisBoat: { type: String }, // Rich text (HTML/Markdown) - legacy top-level
    specifications: { type: String }, // Rich text (HTML/Markdown) - legacy top-level
    boatLayout: { type: String }, // Rich text (HTML/Markdown) - legacy top-level
    videoLink: { type: String }, // e.g., http://www.youtube.com
    badge: { type: String },
    design: { type: String },
    built: { type: String },
    cruisingSpeed: { type: String },
    lengthOverall: { type: String },
    fuelCapacity: { type: String },
    waterCapacity: { type: String },
    code: { type: String },
    tags: [{ type: String }], // e.g., ['Luxury', 'Premium', 'Standard'] (legacy top-level)
    slug: {
      type: String,
      unique: true,
      // Allows multiple null/undefined values
    },
    translations: {
      en: { type: translationSchema, required: true },
      fr: translationSchema,
      de: translationSchema,
      ru: translationSchema,
      zh: translationSchema,
      th: translationSchema,
      ar: translationSchema,
    },
    type: {
      type: String,
      enum: ['crewed', 'bareboat'],
      required: true,
    },
    status: {
      type: String,
      enum: ['draft', 'published'],
      default: 'draft',
    },
    displayOrder: {
      type: Number,
      default: 9999, // Higher number = lower priority (appears later)
      // Lower numbers appear first (1 = first, 2 = second, etc.)
    },
    createdAt: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
  }
);

// Add indexes for better query performance
yachtSchema.index({ status: 1, createdAt: -1 }); // For getAllYachts with status filter
// Helpful for recently updated sorts
yachtSchema.index({ updatedAt: -1 });
// slug already has unique: true above; avoid duplicate index definitions
yachtSchema.index({ type: 1 }); // For type-based queries
yachtSchema.index({ boatType: 1 }); // For boat type filtering
yachtSchema.index({ price: 1 }); // For price-based queries
yachtSchema.index({ tags: 1 }); // For tag-based filtering
yachtSchema.index({ displayOrder: 1 }); // For display order sorting

export default mongoose.model('Yacht', yachtSchema);
