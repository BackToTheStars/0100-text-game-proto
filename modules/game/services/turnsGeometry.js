const GEOMETRY_FIELDS = {
  _id: true,
  x: true,
  y: true,
  width: true,
  height: true,
  contentType: true,
  createdAt: true,
};

const toIsoDate = (value) => {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  // Битая дата одного хода не должна ронять загрузку всего холста.
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

const toGeometryItem = ({ _id, x, y, width, height, contentType, createdAt }) => ({
  _id,
  contentType,
  position: {
    x,
    y,
  },
  size: {
    width,
    height,
  },
  createdAt: toIsoDate(createdAt),
});

module.exports = {
  GEOMETRY_FIELDS,
  toGeometryItem,
};
