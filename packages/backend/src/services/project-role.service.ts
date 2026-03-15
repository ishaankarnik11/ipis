// Re-export everything from the new designation service for backwards compatibility
export {
  createDesignation as createRole,
  getAllDesignations as getAllRoles,
  updateDesignation as updateRole,
  validateDesignationId as validateRoleId,
} from './designation.service.js';
