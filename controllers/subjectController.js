import Subject from "../models/Subject.js";
import Topic from "../models/Topic.js";
import Exam from "../models/Exam.js";
import {
  uploadToCloudinary,
  deleteFromCloudinary,
  extractPublicId,
} from "../utils/cloudinary.js";
import {
  parseTopicsInput,
  sanitizeDescription,
  normalizeTags,
  formatSubjectResponse,
} from "../utils/content.js";

const populateSubjectWithTopics = (subjectId) => {
  return Subject.findById(subjectId).populate({
    path: "topics",
    options: { sort: { createdAt: 1 } },
  });
};

const sanitizeTopicPayload = (topic) => {
  if (!topic || typeof topic !== "object") {
    return null;
  }

  const title = topic.title?.trim();
  const description = sanitizeDescription(topic.description || "");

  if (!title || !description) {
    return null;
  }

  return {
    title,
    description,
    image: topic.image?.trim() || null,
    tags: normalizeTags(topic.tags),
  };
};

const deleteImageIfExists = async (imageUrl) => {
  if (!imageUrl) return;
  const publicId = extractPublicId(imageUrl);
  if (publicId) {
    await deleteFromCloudinary(publicId, "image");
  }
};

// Create subject
export const createSubject = async (req, res) => {
  try {
    const { title, description, topics } = req.body;

    const trimmedTitle = title?.trim();
    const cleanedDescription = sanitizeDescription(description || "");

    if (!trimmedTitle || !cleanedDescription) {
      return res
        .status(400)
        .json({ message: "Title and description are required" });
    }

    const parsedTopics = parseTopicsInput(topics)
      .map(sanitizeTopicPayload)
      .filter(Boolean);

    if (parsedTopics.length === 0) {
      return res
        .status(400)
        .json({ message: "At least one valid topic is required" });
    }

    let imageUrl = null;
    if (req.file) {
      try {
        const uploadResult = await uploadToCloudinary(
          req.file,
          "cloudnaiy/subjects",
          "auto"
        );
        imageUrl = uploadResult.secure_url;
      } catch (error) {
        return res.status(500).json({
          message: "Failed to upload subject image: " + error.message,
        });
      }
    }

    const subject = await Subject.create({
      title: trimmedTitle,
      description: cleanedDescription,
      image: imageUrl,
      createdBy: req.user._id,
    });

    const topicsToInsert = parsedTopics.map((topic) => ({
      ...topic,
      subject: subject._id,
    }));

    try {
      await Topic.insertMany(topicsToInsert);
    } catch (topicError) {
      await Subject.deleteOne({ _id: subject._id });
      throw topicError;
    }

    const subjectWithTopics = await populateSubjectWithTopics(subject._id);

    res.status(201).json({
      message: "Subject created successfully",
      subject: formatSubjectResponse(subjectWithTopics),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all subjects
export const getSubjects = async (req, res) => {
  try {
    const subjects = await Subject.find()
      .sort({ createdAt: -1 })
      .populate({
        path: "topics",
        options: { sort: { createdAt: 1 } },
      });

    res.json({
      subjects: subjects.map(formatSubjectResponse),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get single subject
export const getSubject = async (req, res) => {
  try {
    const subject = await populateSubjectWithTopics(req.params.id);

    if (!subject) {
      return res.status(404).json({ message: "Subject not found" });
    }

    res.json({
      subject: formatSubjectResponse(subject),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update subject
export const updateSubject = async (req, res) => {
  try {
    const { title, description } = req.body;
    const subject = await Subject.findById(req.params.id);

    if (!subject) {
      return res.status(404).json({ message: "Subject not found" });
    }

    if (title !== undefined) {
      const trimmedTitle = title.trim();
      if (!trimmedTitle) {
        return res.status(400).json({ message: "Title cannot be empty" });
      }
      subject.title = trimmedTitle;
    }
    if (description !== undefined) {
      const cleanedDescription = sanitizeDescription(description);
      if (!cleanedDescription) {
        return res.status(400).json({ message: "Description cannot be empty" });
      }
      subject.description = cleanedDescription;
    }

    if (req.file) {
      if (subject.image) {
        await deleteImageIfExists(subject.image);
      }

      try {
        const uploadResult = await uploadToCloudinary(
          req.file,
          "cloudnaiy/subjects",
          "auto"
        );
        subject.image = uploadResult.secure_url;
      } catch (error) {
        return res.status(500).json({
          message: "Failed to upload subject image: " + error.message,
        });
      }
    }

    await subject.save();
    const updatedSubject = await populateSubjectWithTopics(subject._id);

    res.json({
      message: "Subject updated successfully",
      subject: formatSubjectResponse(updatedSubject),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete subject
export const deleteSubject = async (req, res) => {
  try {
    const subject = await Subject.findById(req.params.id).populate("topics");

    if (!subject) {
      return res.status(404).json({ message: "Subject not found" });
    }

    if (subject.image) {
      await deleteImageIfExists(subject.image);
    }

    const topicImages =
      subject.topics?.map((topic) => topic.image).filter(Boolean) || [];
    await Promise.all(topicImages.map(deleteImageIfExists));

    await Topic.deleteMany({ subject: subject._id });
    await Exam.deleteMany({ subject: subject._id });
    await Subject.deleteOne({ _id: subject._id });

    res.json({ message: "Subject deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete all subjects (admin only) - Enhanced version with detailed cleanup
export const deleteAllSubjects = async (req, res) => {
  try {
    // Additional safety checks
    const { confirmation, adminPassword } = req.body;

    if (!confirmation || confirmation !== "DELETE_ALL_SUBJECTS") {
      return res.status(400).json({
        message:
          'Confirmation required. Send { confirmation: "DELETE_ALL_SUBJECTS" } in request body to proceed.',
      });
    }

    // Optional: Verify admin password for extra security
    if (adminPassword) {
      const User = (await import("../models/User.js")).default;
      const adminUser = await User.findById(req.user._id);
      const isPasswordValid = await adminUser.comparePassword(adminPassword);

      if (!isPasswordValid) {
        return res.status(401).json({
          message: "Invalid admin password",
        });
      }
    }

    // Get all subjects with their topics
    const allSubjects = await Subject.find().populate("topics");

    if (allSubjects.length === 0) {
      return res.json({
        message: "No subjects found to delete",
      });
    }

    let totalDeletedSubjects = 0;
    let totalDeletedTopics = 0;
    let totalDeletedExams = 0;
    const deletedSubjectTitles = [];

    // Delete each subject with its associated data
    for (const subject of allSubjects) {
      try {
        // Delete subject image from Cloudinary if exists
        if (subject.image) {
          await deleteImageIfExists(subject.image);
        }

        // Delete topic images from Cloudinary
        const topicImages =
          subject.topics?.map((topic) => topic.image).filter(Boolean) || [];
        await Promise.all(topicImages.map(deleteImageIfExists));

        // Delete all topics for this subject
        const topicDeleteResult = await Topic.deleteMany({
          subject: subject._id,
        });
        totalDeletedTopics += topicDeleteResult.deletedCount;

        // Delete all exams for this subject
        const examDeleteResult = await Exam.deleteMany({
          subject: subject._id,
        });
        totalDeletedExams += examDeleteResult.deletedCount;

        // Delete the subject
        await Subject.deleteOne({ _id: subject._id });
        totalDeletedSubjects++;
        deletedSubjectTitles.push(subject.title);
      } catch (subjectError) {
        console.error(`Error deleting subject ${subject.title}:`, subjectError);
        // Continue with next subject even if one fails
      }
    }

    console.warn(
      `ADMIN ACTION: User ${req.user.username} deleted ${totalDeletedSubjects} subjects, ${totalDeletedTopics} topics, and ${totalDeletedExams} exams`
    );

    res.json({
      message: `Successfully deleted ${totalDeletedSubjects} subjects and all associated data`,
      summary: {
        deletedSubjects: totalDeletedSubjects,
        deletedTopics: totalDeletedTopics,
        deletedExams: totalDeletedExams,
      },
      deletedSubjects: deletedSubjectTitles,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error in deleteAllSubjects:", error);
    res.status(500).json({ message: error.message });
  }
};
