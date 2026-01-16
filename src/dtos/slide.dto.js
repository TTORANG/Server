const slideAssetMapper = (slide) => {
  let mainAsset = null;
  for (const asset of slide.assets) {
    if (asset.assetType === "image") {
      mainAsset = asset;
      break;
    }
  }

  if (mainAsset === null && slide.assets.length > 0) {
    mainAsset = slide.assets[0];
  }

  return mainAsset;
};
export const slideListResponseDTO = (slides) => {
  return slides.map((slide) => {
    let mainAsset = slideAssetMapper(slide);

    return {
      slideId: slide.id.toString(),
      projectId: slide.projectId.toString(),
      title: slide.title || `슬라이드 ${slide.slideNum}`,
      slideNum: slide.slideNum ? Number(slide.slideNum) : null,
      imageUrl: mainAsset ? mainAsset.url : null,
      createdAt: slide.createdAt,
      updatedAt: slide.updatedAt,
    };
  });
};

export const slideResponseDTO = (slide) => {
  let mainAsset = slideAssetMapper(slide);

  return {
    slideId: slide.id.toString(),
    title: slide.title,
    slideNum: slide.slideNum ? Number(slide.slideNum) : null,
    imageUrl: mainAsset ? mainAsset.url : null,
    updatedAt: slide.updatedAt,
  };
};
