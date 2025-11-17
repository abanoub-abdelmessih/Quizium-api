import Subject from "../models/Subject.js";
import Topic from "../models/Topic.js";
import {
  uploadToCloudinary,
  extractPublicId,
  deleteFromCloudinary,
} from "../utils/cloudinary.js";
import {
  sanitizeDescription,
  normalizeTags,
  formatTopicResponse,
} from "../utils/content.js";

const ensureSubject = async (subjectId) => {
  const subject = await Subject.findById(subjectId);
  if (!subject) {
    const error = new Error("Subject not found");
    error.statusCode = 404;
    throw error;
  }
  return subject;
};

const findTopic = async (subjectId, topicId) => {
  const topic = await Topic.findOne({ _id: topicId, subject: subjectId });
  if (!topic) {
    const error = new Error("Topic not found");
    error.statusCode = 404;
    throw error;
  }
  return topic;
};

const deleteImageIfExists = async (imageUrl) => {
  if (!imageUrl) return;
  const publicId = extractPublicId(imageUrl);
  if (publicId) {
    await deleteFromCloudinary(publicId, "image");
  }
};

const uploadTopicImage = async (file) => {
  if (!file) return null;
  const uploadResult = await uploadToCloudinary(
    file,
    "cloudnaiy/topics",
    "auto"
  );
  return uploadResult.secure_url;
};

const parseImageInput = async (file, fallback) => {
  if (file) {
    return uploadTopicImage(file);
  }

  if (fallback && typeof fallback === "string" && fallback.trim()) {
    return fallback.trim();
  }

  return null;
};

export const createTopic = async (req, res) => {
  try {
    const { title, description, tags } = req.body;
    const { id: subjectId } = req.params;

    await ensureSubject(subjectId);

    const trimmedTitle = title?.trim();
    const cleanedDescription = sanitizeDescription(description || "");

    if (!trimmedTitle || !cleanedDescription) {
      return res
        .status(400)
        .json({ message: "Title and description are required" });
    }

    const imageUrl = await parseImageInput(req.file, req.body.image);

    const topic = await Topic.create({
      subject: subjectId,
      title: trimmedTitle,
      description: cleanedDescription,
      image: imageUrl,
      tags: normalizeTags(tags),
    });

    res.status(201).json({
      message: "Topic created successfully",
      topic: formatTopicResponse(topic),
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

export const getTopics = async (req, res) => {
  try {
    const { id: subjectId } = req.params;
    await ensureSubject(subjectId);

    const topics = await Topic.find({ subject: subjectId }).sort({
      createdAt: 1,
    });

    res.json({
      topics: topics.map(formatTopicResponse),
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

export const getTopic = async (req, res) => {
  try {
    const { id: subjectId, topicId } = req.params;
    await ensureSubject(subjectId);
    const topic = await findTopic(subjectId, topicId);

    res.json({ topic: formatTopicResponse(topic) });
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

export const updateTopic = async (req, res) => {
  try {
    const { id: subjectId, topicId } = req.params;
    await ensureSubject(subjectId);
    const topic = await findTopic(subjectId, topicId);

    const { title, description, tags, image } = req.body;
    let hasUpdates = false;

    if (title !== undefined) {
      const trimmedTitle = title.trim();
      if (!trimmedTitle) {
        return res.status(400).json({ message: "Title cannot be empty" });
      }
      topic.title = trimmedTitle;
      hasUpdates = true;
    }

    if (description !== undefined) {
      const cleanedDescription = sanitizeDescription(description);
      if (!cleanedDescription) {
        return res.status(400).json({ message: "Description cannot be empty" });
      }
      topic.description = cleanedDescription;
      hasUpdates = true;
    }

    if (tags !== undefined) {
      topic.tags = normalizeTags(tags);
      hasUpdates = true;
    }

    if (req.file || (image && image !== topic.image)) {
      if (topic.image) {
        await deleteImageIfExists(topic.image);
      }
      topic.image = await parseImageInput(req.file, image);
      hasUpdates = true;
    }

    if (!hasUpdates) {
      return res.status(400).json({ message: "No updates provided" });
    }

    await topic.save();

    res.json({
      message: "Topic updated successfully",
      topic: formatTopicResponse(topic),
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

export const deleteTopic = async (req, res) => {
  try {
    const { id: subjectId, topicId } = req.params;
    await ensureSubject(subjectId);
    const existingCount = await Topic.countDocuments({ subject: subjectId });

    if (existingCount <= 1) {
      return res.status(400).json({
        message:
          "Subjects must have at least one topic. Create a new topic before deleting this one.",
      });
    }

    const topic = await findTopic(subjectId, topicId);

    if (topic.image) {
      await deleteImageIfExists(topic.image);
    }

    await Topic.deleteOne({ _id: topic._id });

    res.json({ message: "Topic deleted successfully" });
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};
