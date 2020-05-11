/*
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
*/

import { URL } from "url";

/**
 * The external interface exposed by the IBM Cloud Account extension
 * for use by other modules to interact with IBM Cloud APIs.
 */
export interface CloudAccountApi {

    /**
     * Determine whether we are logged into IBM Cloud or not.
     * @returns boolean True if logged into IBM Cloud, false if logged out.
     */
    loggedIn(): Promise<boolean>;

    /**
     * Determine whether we have selected an IBM Cloud account or not.
     * @returns boolean True if an IBM Cloud account has been selected, false if not.
     */
    accountSelected(): Promise<boolean>;

    /**
     * Get an access token suitable for use with IBM Cloud APIs.
     * @param accountRequired True to ensure that the user has selected an IBM Cloud account.
     * @returns string The access token.
     */
    getAccessToken(accountRequired?: boolean): Promise<string>;

    /**
     * Get a refresh token suitable for use with IBM Cloud APIs.
     * @param accountRequired True to ensure that the user has selected an IBM Cloud account.
     * @returns string The refresh token.
     */
    getRefreshToken(accountRequired?: boolean): Promise<string>;

    /**
     * Get the current IBM Cloud account.
     * @returns string The current IBM Cloud account, or undefined.
     */
    getAccount(): Promise<string | undefined>;

    /**
     * Get the current IBM Cloud email.
     * @returns string The current IBM Cloud email, or undefined.
     */
    getEmail(): Promise<string | undefined>;

}
