import * as functions from "firebase-functions";
/**
 * Create a new admin user via HTTP callable function
 * Only existing admins can call this
 */
export declare const createAdminUser: functions.HttpsFunction & functions.Runnable<any>;
/**
 * Create a new facilitator user via HTTP callable function
 * Only admins can call this
 */
export declare const createFacilitatorUser: functions.HttpsFunction & functions.Runnable<any>;
/**
 * Assign school administrator
 * Only admins can call this
 */
export declare const assignSchoolAdmin: functions.HttpsFunction & functions.Runnable<any>;
//# sourceMappingURL=admin.d.ts.map