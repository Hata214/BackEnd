const compression = require('compression');

// Pagination middleware
const paginateResults = (defaultLimit = 10, maxLimit = 100) => {
    return (req, res, next) => {
        const page = parseInt(req.query.page) || 1;
        const limit = Math.min(parseInt(req.query.limit) || defaultLimit, maxLimit);
        const skip = (page - 1) * limit;

        req.pagination = {
            page,
            limit,
            skip,
            // Thêm các helper functions
            getNextPage: (totalItems) => {
                const totalPages = Math.ceil(totalItems / limit);
                return page < totalPages ? page + 1 : null;
            },
            getPrevPage: () => {
                return page > 1 ? page - 1 : null;
            },
            getMetadata: (totalItems) => {
                const totalPages = Math.ceil(totalItems / limit);
                return {
                    currentPage: page,
                    itemsPerPage: limit,
                    totalItems,
                    totalPages,
                    hasNextPage: page < totalPages,
                    hasPrevPage: page > 1
                };
            }
        };
        next();
    };
};

// Response compression
const compressResponse = compression({
    filter: (req, res) => {
        if (req.headers['x-no-compression']) {
            return false;
        }
        return compression.filter(req, res);
    },
    level: 6 // Compression level (0-9)
});

// Query optimization middleware
const optimizeQuery = () => {
    return (req, res, next) => {
        // Tối ưu các tham số truy vấn
        if (req.query.select) {
            req.query.select = req.query.select.split(',').join(' ');
        }
        if (req.query.sort) {
            req.query.sort = req.query.sort.split(',').join(' ');
        }

        // Thêm các helper functions cho query
        req.optimizedQuery = {
            getSelectFields: () => req.query.select || '',
            getSortCriteria: () => req.query.sort || '-createdAt',
            getFilterCriteria: () => {
                const filter = {};
                // Loại bỏ các tham số đặc biệt
                const excludedFields = ['page', 'limit', 'sort', 'select'];
                Object.keys(req.query).forEach(key => {
                    if (!excludedFields.includes(key)) {
                        filter[key] = req.query[key];
                    }
                });
                return filter;
            }
        };
        next();
    };
};

// Performance monitoring middleware
const monitorPerformance = () => {
    return (req, res, next) => {
        const start = process.hrtime();

        // Thêm response time vào header
        res.on('finish', () => {
            const [seconds, nanoseconds] = process.hrtime(start);
            const duration = seconds * 1000 + nanoseconds / 1000000;
            res.set('X-Response-Time', `${duration.toFixed(2)}ms`);

            // Log slow requests (>500ms)
            if (duration > 500) {
                console.warn(`Slow request: ${req.method} ${req.originalUrl} - ${duration.toFixed(2)}ms`);
            }
        });

        next();
    };
};

module.exports = {
    paginateResults,
    compressResponse,
    optimizeQuery,
    monitorPerformance
}; 