import fs from 'fs';
import sharp from 'sharp';

const DEFAULT_QUALITY = 90;
const DEFAULT_WIDTH = 1200;
const DEFAULT_HEIGHT = 1200;
const DEFAULT_SUFFIX = 'original';

// Handle image file resizes for one or more fields, like:
//
// [
//    {
//      name: "headerImages",
//      versions: [{
//        width: 900,
//        height: 600,
//      }],
//    },
//    {
//      name: "galleryImages",
//      versions: [{
//        suffix: 'sm',
//        width: 900,
//        height: 600,
//      }, {
//        width: 1600,
//        height: 1600,
//      }],
//    },
//    ...
// ]
export default function convertImages(fields) {
  const fileType = 'jpeg';
  const fileTypeExt = 'jpg';

  return async (req, res, next) => {
    if (!req.files) {
      return next();
    }

    try {
      const operations = fields.reduce((acc, field) => {
        if (!(field.name in req.files)) {
          return acc;
        }

        field.versions.forEach((version) => {
          const {
            quality = DEFAULT_QUALITY,
            width = DEFAULT_WIDTH,
            height = DEFAULT_HEIGHT,
            suffix = DEFAULT_SUFFIX,
          } = version;

          req.files[field.name].forEach((file, index) => {
            // Rename file based on version suffix
            const originalFileName = file.filename;
            const originalFileNameBase = originalFileName.split('.')[0];
            const newFileName = `${originalFileNameBase}-${suffix}.${fileTypeExt}`;

            const promise = new Promise((resolve, reject) => {
              sharp(file.path)
                .resize(width, height, {
                  fit: sharp.fit.cover,
                  position: sharp.strategy.entropy,
                  withoutEnlargement: true,
                })
                .toFormat(fileType, { quality })
                .toBuffer((error, buffer) => {
                  if (error) {
                    reject(error);
                  } else {
                    fs.unlink(file.path, () => {
                      resolve({
                        index,
                        fieldname: field.name,
                        originalFileName,
                        fileName: newFileName,
                        fileType,
                        buffer,
                        version,
                      });
                    });
                  }
                });
            });

            acc.push(promise);
          });
        });

        return acc;
      }, []);

      const results = await Promise.all(operations);

      // Group versions by original image
      req.locals = req.locals || {};
      req.locals.images = results.reduce(
        (acc, { index, fieldname, ...rest }) => {
          if (!acc[fieldname]) {
            acc[fieldname] = [];
          }

          if (!acc[fieldname][index]) {
            acc[fieldname][index] = [];
          }

          acc[fieldname][index].push(rest);

          return acc;
        },
        {},
      );

      next();
    } catch (error) {
      next(error);
    }
  };
}
