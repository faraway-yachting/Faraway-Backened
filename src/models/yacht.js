import mongoose from 'mongoose';

const yachtSchema = new mongoose.Schema({
  boatType: { type: String,  }, // e.g., Power
  price: { type: String }, // e.g., Budget
  capacity: { type: String }, // e.g., Day Charter
  length: { type: String }, // e.g., 35sq
  lengthRange: { type: String },
  title: { type: String, }, // e.g., Luxury Yacht
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
  dayCharter: { type: String }, // Rich text (HTML/Markdown)
  overnightCharter: { type: String }, // Rich text (HTML/Markdown)
  aboutThisBoat: { type: String }, // Rich text (HTML/Markdown)
  specifications: { type: String }, // Rich text (HTML/Markdown)
  boatLayout: { type: String }, // Rich text (HTML/Markdown)
  videoLink: { type: String }, // e.g., http://www.youtube.com
  badge: { type: String },
  design: { type: String },
  built: { type: String },
  cruisingSpeed: { type: String },
  lengthOverall: { type: String },
  fuelCapacity: { type: String },
  waterCapacity: { type: String },
  code: { type: String },
  slug: {
    type: String,
    unique: true,
    // Allows multiple null/undefined values
  },
  type: {
    type: String,
    enum: ['crewed', 'bareboat'],
    required: true,
  },
  status: {
    type: String,
    enum: ['draft', 'published'],
    default: 'draft'
  },
  createdAt: { type: Date, default: Date.now }
});
export default mongoose.model('Yacht', yachtSchema);