const mongoose = require("mongoose");
mongoose.Promise = global.Promise;
const slug = require("slugs"); // allowing us to make URLs friendly names

const storeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
      required: "Please enter a store name!"
    },
    slug: String,
    description: {
      type: String,
      trim: true
    },
    tags: [String],
    created: {
      type: Date,
      default: Date.now
    },
    location: {
      type: {
        type: String,
        default: "Point"
      },
      coordinates: [
        {
          type: Number,
          required: "You must supply coordinates!"
        }
      ],
      address: {
        type: String,
        required: "You must supply and address!"
      }
    },
    photo: String,
    author: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
      required: "You must supply an author"
    }
  },
  {
    toJSON: { virtuals: true }, // no necessary, just if wnat to see the virtuals on a dump
    toObject: { virtuals: true } // no necessary, just if wnat to see the virtuals on a dump
  }
);

// Define our stores
storeSchema.index({
  name: "text",
  description: "text"
});

storeSchema.index({
  location: "2dsphere"
});

// this is just when creating
storeSchema.pre("save", async function(next) {
  if (!this.isModified("name")) {
    next(); //skip it
    return; // stop this function from running
    // return next(); // correct too
  }
  this.slug = slug(this.name);
  // find other stores that have a duplicated slug
  const slugRegEx = new RegExp(`^(${this.slug})((-[0-9]*$)?)$`, "i");
  const storesWithSlug = await this.constructor.find({ slug: slugRegEx });
  if (storesWithSlug.length) {
    this.slug = `${this.slug}-${storesWithSlug.length + 1}`;
  }
  next();
  // TODO: make more resiliant so slugs are unique
});

storeSchema.statics.getTagsList = function() {
  return this.aggregate([
    { $unwind: "$tags" },
    { $group: { _id: "$tags", count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]);
};

storeSchema.statics.getTopStores = function() {
  return this.aggregate([
    // Lookup Stores and populate their reviews
    {
      $lookup: {
        from: "reviews",
        localField: "_id",
        foreignField: "store",
        as: "reviews"
      }
    }, // filter for only items that have 2 or more reviews
    { $match: { "reviews.1": { $exists: true } } }, // Add the average reviews field
    // {
    //   $project: {
    //     photo: "$$ROOT.photo",
    //     name: "$$ROOT.name",
    //     reviews: "$$ROOT.reviews",
    //     averageRating: { $avg: "$reviews.rating" }
    //   }
    // }
    {
      $addFields: {
        averageRating: {
          $avg: "$reviews.rating"
        }
      }
    },
    // sort it by our new field, highest reviews first
    {
      $sort: {
        averageRating: -1
      }
    },
    // limit to at most 10
    { $limit: 10 }
  ]);
};

// find reviews where the sotres _id property === reviews store property
storeSchema.virtual("reviews", {
  ref: "Review", // what model to link?
  localField: "_id", // which field on the store?
  foreignField: "store" // which field on the review?
});

function autopopulate(next) {
  this.populate("reviews");
  next();
}

storeSchema.pre("find", autopopulate);
storeSchema.pre("findOne", autopopulate);

module.exports = mongoose.model("Store", storeSchema);
