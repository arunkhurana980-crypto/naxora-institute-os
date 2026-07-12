import mongoose from "mongoose";

const liveClassCommentSchema = new mongoose.Schema(
  {
    liveClass: { type: mongoose.Schema.Types.ObjectId, ref: "LiveClass", required: true, index: true },
    text: { type: String, required: [true, "Comment text required hai"], trim: true, maxlength: 700 },
    authorName: { type: String, trim: true, maxlength: 120, default: "NAXORA User" },
    authorRole: { type: String, trim: true, maxlength: 40, default: "student" },
    isPinned: { type: Boolean, default: false },
    status: { type: String, enum: ["visible", "hidden"], default: "visible", index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  },
  { timestamps: true }
);

liveClassCommentSchema.index({ liveClass: 1, createdAt: -1 });

export default mongoose.model("LiveClassComment", liveClassCommentSchema);
