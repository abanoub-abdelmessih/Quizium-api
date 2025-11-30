const stripHTML = (text = "") => text.replace(/<[^>]*>/g, " ");

export const sanitizeDescription = (text = "") => {
  return stripHTML(text)
    .replace(/[\r\n]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

export const normalizeTags = (tagsInput) => {
  if (!tagsInput) return [];

  const toArray = (value) => {
    if (Array.isArray(value)) return value;
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (!trimmed) return [];
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) return parsed;
      } catch {
        // Not JSON, fall through to comma split
      }
      return trimmed.split(",").map((tag) => tag.trim());
    }
    return [];
  };

  return toArray(tagsInput)
    .map((tag) => tag.trim())
    .filter(Boolean);
};

export const parseTopicsInput = (topicsInput) => {
  if (!topicsInput) return [];

  if (typeof topicsInput === "string") {
    const trimmed = topicsInput.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  if (Array.isArray(topicsInput)) {
    return topicsInput;
  }

  return [];
};

export const formatTopicResponse = (topicDoc) => ({
  id: topicDoc._id.toString(),
  title: topicDoc.title,
  description: topicDoc.description,
  image: topicDoc.image || null,
  tags: topicDoc.tags || [],
  createdAt: topicDoc.createdAt,
  updatedAt: topicDoc.updatedAt,
});

export const formatSubjectResponse = (subjectDoc) => ({
  id: subjectDoc._id.toString(),
  title: subjectDoc.title,
  description: subjectDoc.description,
  image: subjectDoc.image || null,
  topics: (subjectDoc.topics || []).map(formatTopicResponse),
  createdBy: subjectDoc.createdBy
    ? {
        _id: subjectDoc.createdBy._id.toString(),
        name: subjectDoc.createdBy.name,
        email: subjectDoc.createdBy.email,
      }
    : null,
  createdAt: subjectDoc.createdAt,
  updatedAt: subjectDoc.updatedAt,
});
