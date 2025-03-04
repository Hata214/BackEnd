const roles = {
    USER: 'user',
    ADMIN: 'admin',
    SUPER_ADMIN: 'super_admin'
};

const permissions = {
    // User permissions
    USER_READ_OWN_PROFILE: 'user:read-own-profile',
    USER_UPDATE_OWN_PROFILE: 'user:update-own-profile',
    USER_DELETE_OWN_ACCOUNT: 'user:delete-own-account',

    // Budget permissions
    BUDGET_CREATE: 'budget:create',
    BUDGET_READ_OWN: 'budget:read-own',
    BUDGET_UPDATE_OWN: 'budget:update-own',
    BUDGET_DELETE_OWN: 'budget:delete-own',
    BUDGET_READ_ALL: 'budget:read-all',
    BUDGET_UPDATE_ALL: 'budget:update-all',
    BUDGET_DELETE_ALL: 'budget:delete-all',

    // Transaction permissions
    TRANSACTION_CREATE: 'transaction:create',
    TRANSACTION_READ_OWN: 'transaction:read-own',
    TRANSACTION_UPDATE_OWN: 'transaction:update-own',
    TRANSACTION_DELETE_OWN: 'transaction:delete-own',
    TRANSACTION_READ_ALL: 'transaction:read-all',
    TRANSACTION_UPDATE_ALL: 'transaction:update-all',
    TRANSACTION_DELETE_ALL: 'transaction:delete-all',

    // Category permissions
    CATEGORY_CREATE_OWN: 'category:create-own',
    CATEGORY_READ_OWN: 'category:read-own',
    CATEGORY_UPDATE_OWN: 'category:update-own',
    CATEGORY_DELETE_OWN: 'category:delete-own',
    CATEGORY_CREATE_DEFAULT: 'category:create-default',
    CATEGORY_READ_ALL: 'category:read-all',
    CATEGORY_UPDATE_ALL: 'category:update-all',
    CATEGORY_DELETE_ALL: 'category:delete-all',

    // Report permissions
    REPORT_VIEW_OWN: 'report:view-own',
    REPORT_EXPORT_OWN: 'report:export-own',
    REPORT_VIEW_ALL: 'report:view-all',
    REPORT_EXPORT_ALL: 'report:export-all',

    // User management permissions
    USER_CREATE: 'user:create',
    USER_READ_ALL: 'user:read-all',
    USER_UPDATE_ALL: 'user:update-all',
    USER_DELETE_ALL: 'user:delete-all',
    USER_BLOCK: 'user:block',
    USER_UNBLOCK: 'user:unblock',

    // System permissions
    SYSTEM_VIEW_LOGS: 'system:view-logs',
    SYSTEM_UPDATE_SETTINGS: 'system:update-settings',
    SYSTEM_MANAGE_ROLES: 'system:manage-roles'
};

const rolePermissions = {
    [roles.USER]: [
        permissions.USER_READ_OWN_PROFILE,
        permissions.USER_UPDATE_OWN_PROFILE,
        permissions.USER_DELETE_OWN_ACCOUNT,
        permissions.BUDGET_CREATE,
        permissions.BUDGET_READ_OWN,
        permissions.BUDGET_UPDATE_OWN,
        permissions.BUDGET_DELETE_OWN,
        permissions.TRANSACTION_CREATE,
        permissions.TRANSACTION_READ_OWN,
        permissions.TRANSACTION_UPDATE_OWN,
        permissions.TRANSACTION_DELETE_OWN,
        permissions.CATEGORY_CREATE_OWN,
        permissions.CATEGORY_READ_OWN,
        permissions.CATEGORY_UPDATE_OWN,
        permissions.CATEGORY_DELETE_OWN,
        permissions.REPORT_VIEW_OWN,
        permissions.REPORT_EXPORT_OWN
    ],
    [roles.ADMIN]: [
        // Kế thừa tất cả quyền của user
        ...rolePermissions[roles.USER],
        // Quyền quản lý người dùng
        permissions.USER_READ_ALL,
        permissions.USER_BLOCK,
        permissions.USER_UNBLOCK,
        // Quyền quản lý danh mục
        permissions.CATEGORY_CREATE_DEFAULT,
        permissions.CATEGORY_READ_ALL,
        permissions.CATEGORY_UPDATE_ALL,
        // Quyền xem báo cáo
        permissions.REPORT_VIEW_ALL,
        permissions.REPORT_EXPORT_ALL,
        // Quyền xem log hệ thống
        permissions.SYSTEM_VIEW_LOGS
    ],
    [roles.SUPER_ADMIN]: [
        // Có tất cả các quyền
        ...Object.values(permissions)
    ]
};

module.exports = {
    roles,
    permissions,
    rolePermissions
}; 