import { ProjectNotFoundError } from "../errors/project.error.js";
import { getProjectExist, getSlidesByProjectId } from "../repositories/slide.repository.js";

export const processGetSlides = async (projectID, userId) => {
  const project = await getProjectExist(projectID, userId);

  if (!project) {
    throw new ProjectNotFoundError();
  }

  const slides = await getSlidesByProjectId(projectID);
  return slides;
};
