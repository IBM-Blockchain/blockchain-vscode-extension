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

import { UserInputUtil, IBlockchainQuickPickItem } from './UserInputUtil';
import { FeatureFlagManager, IFeatureFlag } from '../util/FeatureFlags';

export async function manageFeatureFlags(): Promise<void> {
    const items: IBlockchainQuickPickItem<IFeatureFlag>[] = [];
    for (const flag of FeatureFlagManager.ALL) {
        const enabled: boolean = await FeatureFlagManager.enabled(flag);
        items.push({
            data: flag,
            label: flag.getName(),
            description: flag.getDescription(),
            picked: enabled
        });
    }
    const result: IBlockchainQuickPickItem<IFeatureFlag>[] = (await UserInputUtil.showQuickPickItem<IFeatureFlag>('Enable or disable experimental features', items, true)) as IBlockchainQuickPickItem<IFeatureFlag>[];
    if (result === undefined) {
        return;
    }
    for (const flag of FeatureFlagManager.ALL) {
        let enabled: boolean = false;
        for (const item of result) {
            if (flag === item.data) {
                enabled = true;
            }
        }
        if (enabled) {
            await FeatureFlagManager.enable(flag);
        } else {
            await FeatureFlagManager.disable(flag);
        }
    }
}
