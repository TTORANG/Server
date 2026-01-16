import { ProjectNotFoundError } from "../errors/project.error.js";
import { SlideAccessDeniedError, SlideNotFoundError } from "../errors/slide.error.js";
import {
  getNextSlideId,
  getPrevSlideId,
  getProjectExist,
  getSlidesByProjectId,
  getSlideWithProject,
  updateSlideTitle,
} from "../repositories/slide.repository.js";

export const processGetSlides = async (projectID, userId) => {
  const project = await getProjectExist(projectID, userId);

  if (!project) {
    throw new ProjectNotFoundError();
  }

  const slides = await getSlidesByProjectId(projectID);
  return slides;
};

export const processPatchSlideTitle = async (slideId, userId, newTitle) => {
  const slide = await getSlideWithProject(slideId);

  if (!slide) {
    throw new SlideNotFoundError();
  }

  // 권한 확인 (프로젝트 소유주 확인)
  if (slide.project.userId.toString() !== userId.toString()) {
    throw new SlideAccessDeniedError();
  }

  const updatedSlide = await updateSlideTitle(slideId, newTitle);

  return updatedSlide;
};

export const processGetSlideDetail = async (slideId, userId) => {
  const slide = await getSlideWithProject(slideId);

  if (!slide) {
    throw new SlideNotFoundError();
  }

  // 권한 확인 (프로젝트 소유주 확인)
  if (slide.project.userId.toString() !== userId.toString()) {
    throw new SlideAccessDeniedError();
  }

  const prevId = await getPrevSlideId(slide.projectId, slide.slideNum);
  const nextId = await getNextSlideId(slide.projectId, slide.slideNum);

  return { slide, prevId, nextId };
};
