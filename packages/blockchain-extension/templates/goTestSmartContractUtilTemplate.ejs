/**
 * SPDX-License-Identifier: Apache-2.0
 */

package main

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"net/url"
	"os"
	"strings"

	"github.com/ghodss/yaml"
)

// GetConnectionProfile reads the connection profile
func GetConnectionProfile(connectionProfilePath string) ([]byte, error) {
	data, err := ioutil.ReadFile(connectionProfilePath)
	if err != nil {
		return nil, err
	}
	return data, nil
}

// IsLocalhostURL checks if URL is localhost
func IsLocalhostURL(urlToCheck string) bool {
	localhosts := [2]string{"localhost", "127.0.0.1"}
	parsedURL, _ := url.Parse(urlToCheck)

	if parsedURL != nil {
		for _, value := range localhosts {
			if strings.Contains(parsedURL.Host, value) {
				return true
			}
		}
	}
	return false
}

// HasLocalhostURLs determines whether to set SERVICE_DISCOVER_AS_LOCALHOST
func HasLocalhostURLs(connectionProfilePath string) (bool, error) {
	data, err := GetConnectionProfile(connectionProfilePath)
	if err != nil {
		return false, err
	} else if len(data) == 0 {
		return false, fmt.Errorf("File %s is empty", connectionProfilePath)
	}

	var obj map[string]interface{}

	if strings.HasSuffix(connectionProfilePath, ".json") {
		err = json.Unmarshal(data, &obj)
	} else if strings.HasSuffix(connectionProfilePath, ".yml") {
		ymlToJSONData, err := yaml.YAMLToJSON(data)
		if err != nil {
			return false, err
		}
		err = json.Unmarshal(ymlToJSONData, &obj)
	}
	if err != nil {
		return false, err
	}

	var urls []string

	for nodeType, mapValue := range obj {
		switch mapValueType := mapValue.(type) {
		case map[string]interface{}:
			if nodeType == "orderers" || nodeType == "peers" || nodeType == "certificateAuthorities" {
				for _, value := range mapValueType {
					switch valueType := value.(type) {
					case map[string]interface{}:
						if valueType["url"] != nil {
							urls = append(urls, valueType["url"].(string))
						}
					}
				}
			}
		}
	}

	for _, url := range urls {
		isLocal := IsLocalhostURL(url)
		if isLocal {
			return true, nil
		}
	}
	return false, nil
}

// SetDiscoverAsLocalHost sets DISCOVERY_AS_LOCALHOST
func SetDiscoverAsLocalHost(isLocalhost bool) error {
	return os.Setenv("DISCOVERY_AS_LOCALHOST", fmt.Sprintf("%t", isLocalhost))
}
