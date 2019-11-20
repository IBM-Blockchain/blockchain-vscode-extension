/**
 * SPDX-License-Identifier: Apache-2.0
 */

package org.example;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.net.URI;
import java.net.URISyntaxException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Iterator;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.dataformat.yaml.YAMLFactory;

import org.hyperledger.fabric.sdk.helper.Config;
import org.json.JSONException;
import org.json.JSONObject;

/**
 * This file contains functions for the use of your test file.
 * It doesn't require any changes for immediate use.
 */
public class JavaSmartContractUtil {

    public static String getConnectionProfile(Path connectionProfilePath) {
        String data = null;
        try {
            data = new String ( Files.readAllBytes( connectionProfilePath ) );
        } catch (IOException e) {
            e.printStackTrace();
        }
        return data;
    }

    // Checks if URL is localhost
    public static boolean isLocalhostURL(String url) {
        String[] localhosts = {"localhost", "127.0.0.1"};
        URI parsedURL = null;
        try {
            parsedURL = new URI(url);
        } catch (URISyntaxException e) {
            e.printStackTrace();
        }
        assertThat(parsedURL).isNotNull();
        return Arrays.asList(localhosts).indexOf(parsedURL.getHost()) != -1;
    }

    // Used for determining whether to set SERVICE_DISCOVER_AS_LOCALHOST
    public static boolean hasLocalhostURLs(Path connectionProfilePath) {
        String data = getConnectionProfile(connectionProfilePath);
        assertThat(data).isNotNull();

        JSONObject obj = null;
        if (connectionProfilePath.toString().endsWith(".json")) {
            obj = new JSONObject(data);
        } else if (connectionProfilePath.toString().endsWith(".yaml")) {
            ObjectMapper yamlReader = new ObjectMapper(new YAMLFactory());
            ObjectMapper jsonWriter = new ObjectMapper();
            Object yamlObj;
            try {
                yamlObj = yamlReader.readValue(data, Object.class);
                obj = new JSONObject(jsonWriter.writeValueAsString(yamlObj));
            } catch (IOException | JSONException e) {
                e.printStackTrace();
            }
        }
        assertThat(obj).isNotNull();

        String[] nodeTypes = { "orderers", "peers", "certificateAuthorities" };
        String[] presentTypes = JSONObject.getNames(obj);
        ArrayList<String> urls = new ArrayList<>();
        for (String type : nodeTypes) {
            if (Arrays.asList(presentTypes).contains(type)) {
                JSONObject typeObj = obj.getJSONObject(type);
                for (Iterator<String> nodes = typeObj.keys(); nodes.hasNext();) {
                    JSONObject currentNode = typeObj.getJSONObject(nodes.next());
                    if (Arrays.asList(JSONObject.getNames(currentNode)).contains("url")) {
                        urls.add(currentNode.get("url").toString());
                    }
                }
            }
        }

        for (String url : urls) {
            if (isLocalhostURL(url)) {
                return true;
            }
        }
        return false;
    }

    public static void setDiscoverAsLocalHost(boolean isLocalHost) {
        System.setProperty(Config.SERVICE_DISCOVER_AS_LOCALHOST, String.valueOf(isLocalHost));
    }
}
