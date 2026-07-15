"use strict";

const mongoose = require("mongoose");
const { Schema } = mongoose;

const writeMongoUri = process.env.WRITE_MONGO_URI || process.env.MONGODB_URI;

if (!writeMongoUri) {
  throw new Error("WRITE_MONGO_URI or MONGODB_URI is required");
}

const writeConnection = mongoose.createConnection(writeMongoUri, {
  serverSelectionTimeoutMS: 10000,
  socketTimeoutMS: 120000,
});

writeConnection.on("connected", () => {
  console.log("Student write DB connected");
});

writeConnection.on("error", (err) => {
  console.error("Student write DB error:", err.message);
});

const Users = new Schema(
  {
    username: {
      type: String,
      index: true,
    },
    user_type: {
      type: String,
      enum: ["b2c", "b2b"],
      default: "b2c",
      index: true,
    },
    first_name: {
      type: String,
      default: null,
    },
    last_name: {
      type: String,
      default: null,
    },
    email: {
      type: String,
      default: null,
    },
    school_code: {
      type: String,
      default: null,
      trim: true,
    },
    branch: {
      type: String,
      default: null,
      trim: true,
    },
    school_name: {
      type: String,
      default: null,
      trim: true,
    },
    school_address: {
      type: String,
      default: null,
      trim: true,
    },
    school_type: {
      type: String,
      enum: ["SR", "SR1", null],
      default: null,
      trim: true,
      index: true,
    },
    receipt_no: {
      type: String,
      default: null,
      trim: true,
    },
    executive_name: {
      type: String,
      default: null,
      trim: true,
      index: true,
    },
    executive_phone: {
      type: String,
      default: null,
      trim: true,
    },
    registration_source: {
      type: String,
      enum: ["offline_receipt", null],
      default: null,
      index: true,
    },
    class: {
      type: String,
      default: null,
      trim: true,
    },
    section: {
      type: String,
      default: null,
      trim: true,
    },
    preparing_for: {
      type: String,
      enum: ["IIT", "NEET", "CBSE", "PRIMARY", "PREPRIMARY", null],
      default: null,
      trim: true,
    },
    password: {
      type: String,
      default: null,
    },
    temp_password: {
      type: String,
      default: null,
    },
    must_change_password: {
      type: Number,
      default: 0,
    },
    country_code: {
      type: Number,
      index: true,
      default: null,
    },
    country_iso_code: {
      type: String,
      default: null,
    },
    phone: {
      type: String,
      index: true,
      default: null,
    },
    dob: {
      type: Date,
      default: null,
    },
    profile_picture: {
      type: String,
      default: "",
    },
    gender: {
      type: String,
      default: null,
    },
    google_auth_id: {
      type: String,
      default: null,
    },
    google_id: {
      type: String,
      default: null,
    },
    google_user_id: {
      type: String,
      default: null,
    },
    facebook_auth_id: {
      type: String,
      default: null,
    },
    facebook_user_id: {
      type: String,
      default: null,
    },
    apple_auth_id: {
      type: String,
      default: null,
    },
    apple_user_id: {
      type: String,
      default: null,
    },
    access_otp_token: {
      type: String,
      default: null,
    },
    expiry_at: {
      type: String,
      default: null,
    },
    otp_hit_count: {
      type: Number,
      default: 0,
    },
    otp: {
      type: Number,
      default: 0,
    },
    notification_status: {
      type: Number,
      default: 1,
    },
    is_email_verified: {
      type: Number,
      default: 0,
    },
    is_phone_verified: {
      type: Number,
      default: 0,
    },
    notify_videos: {
      type: Number,
      default: 1,
    },
    notify_newsletter: {
      type: Number,
      default: 1,
    },
    notify_email: {
      type: Number,
      default: 1,
    },
    is_active: {
      type: Number,
      default: 1,
    },
    is_archived: {
      type: Number,
      default: 0,
    },
    billing_address: {
      type: String,
      default: null,
    },
    billing_city: {
      type: String,
      default: null,
    },
    billing_state: {
      type: String,
      default: null,
    },
    billing_country: {
      type: String,
      default: null,
    },
    billing_pincode: {
      type: String,
      default: null,
    },
    company_name: {
      type: String,
      default: null,
    },
    company_address: {
      type: String,
      default: null,
    },
    company_city: {
      type: String,
      default: null,
    },
    company_state: {
      type: String,
      default: null,
    },
    company_country: {
      type: String,
      default: null,
    },
    company_pincode: {
      type: String,
      default: null,
    },
    company_owner_name: {
      type: String,
      default: null,
    },
    pancard_image: {
      type: String,
      default: null,
    },
    pancard_name: {
      type: String,
      default: null,
    },
    pancard_type: {
      type: String,
      default: null,
    },
    aadharcard_name: {
      type: String,
      default: null,
    },
    aadharcard_type: {
      type: String,
      default: null,
    },
    aadharcard_image: {
      type: String,
      default: null,
    },
    gtin_number: {
      type: String,
      default: null,
    },
    account_number: {
      type: String,
      default: null,
    },
    ifsc_code: {
      type: String,
      default: null,
    },
    coins: {
      type: Number,
      default: 0,
    },
    is_coins_credited: {
      type: Number,
      default: 0,
    },
    device_limit: {
      type: Number,
      default: 0,
    },
    last_login: {
      type: Date,
      default: null,
    },
    otpCreatedAt: {
      type: Date,
      default: null,
    },
    is_partner_blocked: {
      type: Number,
      default: 0,
    },
    is_contact_sync: {
      type: Number,
      default: 0,
    },
    is_fbsync: {
      type: Number,
      default: 0,
    },
    push_notification_status: {
      type: Number,
      default: 2,
    },
    email_notification_status: {
      type: Number,
      default: 2,
    },
    auth_methods: {
      type: [
        {
          type: String,
          enum: ["otp", "google", "password"],
        },
      ],
      default: [],
    },
    studio_user: [
      {
        studio_id: {
          type: Schema.Types.ObjectId,
          ref: "studios",
          index: true,
        },
        is_active: {
          type: Boolean,
          default: true,
        },
      },
    ],
    roles_user: [
      {
        role_id: {
          type: Schema.Types.ObjectId,
          ref: "roles",
          index: true,
        },
      },
    ],
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  }
);

Users.index(
  { email: 1 },
  {
    unique: true,
    partialFilterExpression: {
      email: { $type: "string" },
    },
  }
);

Users.index(
  { receipt_no: 1 },
  {
    unique: true,
    partialFilterExpression: {
      receipt_no: { $type: "string" },
    },
  }
);

module.exports = writeConnection.model("users", Users, "users");
