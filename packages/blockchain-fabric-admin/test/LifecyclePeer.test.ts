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

import { InstalledSmartContract, LifecyclePeer } from '../src';
import { Endorsement, Endorser, IdentityContext } from 'fabric-common';
import * as protos from 'fabric-protos';
import * as chai from 'chai';
import * as sinonChai from 'sinon-chai';
import * as chaiAsPromised from 'chai-as-promised';
import * as path from 'path';
import { Wallet, Wallets, X509Identity } from 'fabric-network';
import * as sinon from 'sinon';

const should: Chai.Should = chai.should();
chai.use(sinonChai);
chai.use(chaiAsPromised);

// tslint:disable:no-unused-expression
describe('LifecyclePeer', () => {

    describe(`constructor`, () => {
        it('should create a LifecyclePeer instance', () => {
            const peer: LifecyclePeer = new LifecyclePeer({
                url: 'grpcs://localhost:7051',
                mspid: 'myMSPID',
                name: 'myPeer',
                pem: '-----BEGIN CERTIFICATE-----\\nMIICJjCCAc2gAwIBAgIURY9F2Rt0JqOtiHbNJ6rRgfiDy2EwCgYIKoZIzj0EAwIw\\ncDELMAkGA1UEBhMCVVMxFzAVBgNVBAgTDk5vcnRoIENhcm9saW5hMQ8wDQYDVQQH\\nEwZEdXJoYW0xGTAXBgNVBAoTEG9yZzEuZXhhbXBsZS5jb20xHDAaBgNVBAMTE2Nh\\nLm9yZzEuZXhhbXBsZS5jb20wHhcNMjAwMzE2MTQ1MDAwWhcNMzUwMzEzMTQ1MDAw\\nWjBwMQswCQYDVQQGEwJVUzEXMBUGA1UECBMOTm9ydGggQ2Fyb2xpbmExDzANBgNV\\nBAcTBkR1cmhhbTEZMBcGA1UEChMQb3JnMS5leGFtcGxlLmNvbTEcMBoGA1UEAxMT\\nY2Eub3JnMS5leGFtcGxlLmNvbTBZMBMGByqGSM49AgEGCCqGSM49AwEHA0IABHic\\nzHXBRqfe7elvQ8zuxIwigOFCuk/49bjChQxf19fL/qHBLYLOXgd3Ox5jTVyyLuO/\\nf9x19piTv7gVgv8h7BijRTBDMA4GA1UdDwEB/wQEAwIBBjASBgNVHRMBAf8ECDAG\\nAQH/AgEBMB0GA1UdDgQWBBRGw4tXsbZSI45NZNTsDT7rssJpzjAKBggqhkjOPQQD\\nAgNHADBEAiBWNIFkaageeAiEMmhauY3bTHoG45Wgjk99CjHZ6KJoTgIgMfKc9mBL\\na5JHbGNB/gsBhxIm8/akE6g+SikIz/JGty4=\\n-----END CERTIFICATE-----\\n"\n'
            });

            peer['url'].should.equal('grpcs://localhost:7051');
            peer['mspid'].should.equal('myMSPID');
            peer['name'].should.equal('myPeer');
            // @ts-ignore
            peer['pem'].should.equal('-----BEGIN CERTIFICATE-----\\nMIICJjCCAc2gAwIBAgIURY9F2Rt0JqOtiHbNJ6rRgfiDy2EwCgYIKoZIzj0EAwIw\\ncDELMAkGA1UEBhMCVVMxFzAVBgNVBAgTDk5vcnRoIENhcm9saW5hMQ8wDQYDVQQH\\nEwZEdXJoYW0xGTAXBgNVBAoTEG9yZzEuZXhhbXBsZS5jb20xHDAaBgNVBAMTE2Nh\\nLm9yZzEuZXhhbXBsZS5jb20wHhcNMjAwMzE2MTQ1MDAwWhcNMzUwMzEzMTQ1MDAw\\nWjBwMQswCQYDVQQGEwJVUzEXMBUGA1UECBMOTm9ydGggQ2Fyb2xpbmExDzANBgNV\\nBAcTBkR1cmhhbTEZMBcGA1UEChMQb3JnMS5leGFtcGxlLmNvbTEcMBoGA1UEAxMT\\nY2Eub3JnMS5leGFtcGxlLmNvbTBZMBMGByqGSM49AgEGCCqGSM49AwEHA0IABHic\\nzHXBRqfe7elvQ8zuxIwigOFCuk/49bjChQxf19fL/qHBLYLOXgd3Ox5jTVyyLuO/\\nf9x19piTv7gVgv8h7BijRTBDMA4GA1UdDwEB/wQEAwIBBjASBgNVHRMBAf8ECDAG\\nAQH/AgEBMB0GA1UdDgQWBBRGw4tXsbZSI45NZNTsDT7rssJpzjAKBggqhkjOPQQD\\nAgNHADBEAiBWNIFkaageeAiEMmhauY3bTHoG45Wgjk99CjHZ6KJoTgIgMfKc9mBL\\na5JHbGNB/gsBhxIm8/akE6g+SikIz/JGty4=\\n-----END CERTIFICATE-----\\n"\n');
        });

        it('should create a LifecyclePeer instance with sslTargetNameOveride', () => {
            const peer: LifecyclePeer = new LifecyclePeer({
                url: 'grpcs://localhost:7051',
                mspid: 'myMSPID',
                name: 'myPeer',
                sslTargetNameOverride: 'localhost',
                pem: '-----BEGIN CERTIFICATE-----\\nMIICJjCCAc2gAwIBAgIURY9F2Rt0JqOtiHbNJ6rRgfiDy2EwCgYIKoZIzj0EAwIw\\ncDELMAkGA1UEBhMCVVMxFzAVBgNVBAgTDk5vcnRoIENhcm9saW5hMQ8wDQYDVQQH\\nEwZEdXJoYW0xGTAXBgNVBAoTEG9yZzEuZXhhbXBsZS5jb20xHDAaBgNVBAMTE2Nh\\nLm9yZzEuZXhhbXBsZS5jb20wHhcNMjAwMzE2MTQ1MDAwWhcNMzUwMzEzMTQ1MDAw\\nWjBwMQswCQYDVQQGEwJVUzEXMBUGA1UECBMOTm9ydGggQ2Fyb2xpbmExDzANBgNV\\nBAcTBkR1cmhhbTEZMBcGA1UEChMQb3JnMS5leGFtcGxlLmNvbTEcMBoGA1UEAxMT\\nY2Eub3JnMS5leGFtcGxlLmNvbTBZMBMGByqGSM49AgEGCCqGSM49AwEHA0IABHic\\nzHXBRqfe7elvQ8zuxIwigOFCuk/49bjChQxf19fL/qHBLYLOXgd3Ox5jTVyyLuO/\\nf9x19piTv7gVgv8h7BijRTBDMA4GA1UdDwEB/wQEAwIBBjASBgNVHRMBAf8ECDAG\\nAQH/AgEBMB0GA1UdDgQWBBRGw4tXsbZSI45NZNTsDT7rssJpzjAKBggqhkjOPQQD\\nAgNHADBEAiBWNIFkaageeAiEMmhauY3bTHoG45Wgjk99CjHZ6KJoTgIgMfKc9mBL\\na5JHbGNB/gsBhxIm8/akE6g+SikIz/JGty4=\\n-----END CERTIFICATE-----\\n"\n'
            });

            peer['url'].should.equal('grpcs://localhost:7051');
            peer['mspid'].should.equal('myMSPID');
            peer['name'].should.equal('myPeer');
            peer['sslTargetNameOverride'].should.equal('localhost');
            // @ts-ignore
            peer['pem'].should.equal('-----BEGIN CERTIFICATE-----\\nMIICJjCCAc2gAwIBAgIURY9F2Rt0JqOtiHbNJ6rRgfiDy2EwCgYIKoZIzj0EAwIw\\ncDELMAkGA1UEBhMCVVMxFzAVBgNVBAgTDk5vcnRoIENhcm9saW5hMQ8wDQYDVQQH\\nEwZEdXJoYW0xGTAXBgNVBAoTEG9yZzEuZXhhbXBsZS5jb20xHDAaBgNVBAMTE2Nh\\nLm9yZzEuZXhhbXBsZS5jb20wHhcNMjAwMzE2MTQ1MDAwWhcNMzUwMzEzMTQ1MDAw\\nWjBwMQswCQYDVQQGEwJVUzEXMBUGA1UECBMOTm9ydGggQ2Fyb2xpbmExDzANBgNV\\nBAcTBkR1cmhhbTEZMBcGA1UEChMQb3JnMS5leGFtcGxlLmNvbTEcMBoGA1UEAxMT\\nY2Eub3JnMS5leGFtcGxlLmNvbTBZMBMGByqGSM49AgEGCCqGSM49AwEHA0IABHic\\nzHXBRqfe7elvQ8zuxIwigOFCuk/49bjChQxf19fL/qHBLYLOXgd3Ox5jTVyyLuO/\\nf9x19piTv7gVgv8h7BijRTBDMA4GA1UdDwEB/wQEAwIBBjASBgNVHRMBAf8ECDAG\\nAQH/AgEBMB0GA1UdDgQWBBRGw4tXsbZSI45NZNTsDT7rssJpzjAKBggqhkjOPQQD\\nAgNHADBEAiBWNIFkaageeAiEMmhauY3bTHoG45Wgjk99CjHZ6KJoTgIgMfKc9mBL\\na5JHbGNB/gsBhxIm8/akE6g+SikIz/JGty4=\\n-----END CERTIFICATE-----\\n"\n');
        });

        it('should create a LifecyclePeer instance with apiOptions', () => {
            const peer: LifecyclePeer = new LifecyclePeer({
                url: 'grpcs://localhost:7051',
                mspid: 'myMSPID',
                name: 'myPeer',
                apiOptions: {
                    'grpc.default_authority': 'org1peer.127-0-0-1.nip.io:8080',
                    'grpc.ssl_target_name_override': 'org1peer.127-0-0-1.nip.io:8080'
                },
                pem: '-----BEGIN CERTIFICATE-----\\nMIICJjCCAc2gAwIBAgIURY9F2Rt0JqOtiHbNJ6rRgfiDy2EwCgYIKoZIzj0EAwIw\\ncDELMAkGA1UEBhMCVVMxFzAVBgNVBAgTDk5vcnRoIENhcm9saW5hMQ8wDQYDVQQH\\nEwZEdXJoYW0xGTAXBgNVBAoTEG9yZzEuZXhhbXBsZS5jb20xHDAaBgNVBAMTE2Nh\\nLm9yZzEuZXhhbXBsZS5jb20wHhcNMjAwMzE2MTQ1MDAwWhcNMzUwMzEzMTQ1MDAw\\nWjBwMQswCQYDVQQGEwJVUzEXMBUGA1UECBMOTm9ydGggQ2Fyb2xpbmExDzANBgNV\\nBAcTBkR1cmhhbTEZMBcGA1UEChMQb3JnMS5leGFtcGxlLmNvbTEcMBoGA1UEAxMT\\nY2Eub3JnMS5leGFtcGxlLmNvbTBZMBMGByqGSM49AgEGCCqGSM49AwEHA0IABHic\\nzHXBRqfe7elvQ8zuxIwigOFCuk/49bjChQxf19fL/qHBLYLOXgd3Ox5jTVyyLuO/\\nf9x19piTv7gVgv8h7BijRTBDMA4GA1UdDwEB/wQEAwIBBjASBgNVHRMBAf8ECDAG\\nAQH/AgEBMB0GA1UdDgQWBBRGw4tXsbZSI45NZNTsDT7rssJpzjAKBggqhkjOPQQD\\nAgNHADBEAiBWNIFkaageeAiEMmhauY3bTHoG45Wgjk99CjHZ6KJoTgIgMfKc9mBL\\na5JHbGNB/gsBhxIm8/akE6g+SikIz/JGty4=\\n-----END CERTIFICATE-----\\n"\n'
            });

            peer['url'].should.equal('grpcs://localhost:7051');
            peer['mspid'].should.equal('myMSPID');
            peer['name'].should.equal('myPeer');
            peer['apiOptions'].should.deep.equal({
                'grpc.default_authority': 'org1peer.127-0-0-1.nip.io:8080',
                'grpc.ssl_target_name_override': 'org1peer.127-0-0-1.nip.io:8080'
            });
            // @ts-ignore
            peer['pem'].should.equal('-----BEGIN CERTIFICATE-----\\nMIICJjCCAc2gAwIBAgIURY9F2Rt0JqOtiHbNJ6rRgfiDy2EwCgYIKoZIzj0EAwIw\\ncDELMAkGA1UEBhMCVVMxFzAVBgNVBAgTDk5vcnRoIENhcm9saW5hMQ8wDQYDVQQH\\nEwZEdXJoYW0xGTAXBgNVBAoTEG9yZzEuZXhhbXBsZS5jb20xHDAaBgNVBAMTE2Nh\\nLm9yZzEuZXhhbXBsZS5jb20wHhcNMjAwMzE2MTQ1MDAwWhcNMzUwMzEzMTQ1MDAw\\nWjBwMQswCQYDVQQGEwJVUzEXMBUGA1UECBMOTm9ydGggQ2Fyb2xpbmExDzANBgNV\\nBAcTBkR1cmhhbTEZMBcGA1UEChMQb3JnMS5leGFtcGxlLmNvbTEcMBoGA1UEAxMT\\nY2Eub3JnMS5leGFtcGxlLmNvbTBZMBMGByqGSM49AgEGCCqGSM49AwEHA0IABHic\\nzHXBRqfe7elvQ8zuxIwigOFCuk/49bjChQxf19fL/qHBLYLOXgd3Ox5jTVyyLuO/\\nf9x19piTv7gVgv8h7BijRTBDMA4GA1UdDwEB/wQEAwIBBjASBgNVHRMBAf8ECDAG\\nAQH/AgEBMB0GA1UdDgQWBBRGw4tXsbZSI45NZNTsDT7rssJpzjAKBggqhkjOPQQD\\nAgNHADBEAiBWNIFkaageeAiEMmhauY3bTHoG45Wgjk99CjHZ6KJoTgIgMfKc9mBL\\na5JHbGNB/gsBhxIm8/akE6g+SikIz/JGty4=\\n-----END CERTIFICATE-----\\n"\n');
        });

        it('should create a LifecyclePeer instance with request timeout', () => {
            const peer: LifecyclePeer = new LifecyclePeer({
                url: 'grpcs://localhost:7051',
                mspid: 'myMSPID',
                name: 'myPeer',
                requestTimeout: 70000,
                pem: '-----BEGIN CERTIFICATE-----\\nMIICJjCCAc2gAwIBAgIURY9F2Rt0JqOtiHbNJ6rRgfiDy2EwCgYIKoZIzj0EAwIw\\ncDELMAkGA1UEBhMCVVMxFzAVBgNVBAgTDk5vcnRoIENhcm9saW5hMQ8wDQYDVQQH\\nEwZEdXJoYW0xGTAXBgNVBAoTEG9yZzEuZXhhbXBsZS5jb20xHDAaBgNVBAMTE2Nh\\nLm9yZzEuZXhhbXBsZS5jb20wHhcNMjAwMzE2MTQ1MDAwWhcNMzUwMzEzMTQ1MDAw\\nWjBwMQswCQYDVQQGEwJVUzEXMBUGA1UECBMOTm9ydGggQ2Fyb2xpbmExDzANBgNV\\nBAcTBkR1cmhhbTEZMBcGA1UEChMQb3JnMS5leGFtcGxlLmNvbTEcMBoGA1UEAxMT\\nY2Eub3JnMS5leGFtcGxlLmNvbTBZMBMGByqGSM49AgEGCCqGSM49AwEHA0IABHic\\nzHXBRqfe7elvQ8zuxIwigOFCuk/49bjChQxf19fL/qHBLYLOXgd3Ox5jTVyyLuO/\\nf9x19piTv7gVgv8h7BijRTBDMA4GA1UdDwEB/wQEAwIBBjASBgNVHRMBAf8ECDAG\\nAQH/AgEBMB0GA1UdDgQWBBRGw4tXsbZSI45NZNTsDT7rssJpzjAKBggqhkjOPQQD\\nAgNHADBEAiBWNIFkaageeAiEMmhauY3bTHoG45Wgjk99CjHZ6KJoTgIgMfKc9mBL\\na5JHbGNB/gsBhxIm8/akE6g+SikIz/JGty4=\\n-----END CERTIFICATE-----\\n"\n'
            });

            peer['url'].should.equal('grpcs://localhost:7051');
            peer['mspid'].should.equal('myMSPID');
            peer['name'].should.equal('myPeer');
            peer['requestTimeout'].should.equal(70000);
            // @ts-ignore
            peer['pem'].should.equal('-----BEGIN CERTIFICATE-----\\nMIICJjCCAc2gAwIBAgIURY9F2Rt0JqOtiHbNJ6rRgfiDy2EwCgYIKoZIzj0EAwIw\\ncDELMAkGA1UEBhMCVVMxFzAVBgNVBAgTDk5vcnRoIENhcm9saW5hMQ8wDQYDVQQH\\nEwZEdXJoYW0xGTAXBgNVBAoTEG9yZzEuZXhhbXBsZS5jb20xHDAaBgNVBAMTE2Nh\\nLm9yZzEuZXhhbXBsZS5jb20wHhcNMjAwMzE2MTQ1MDAwWhcNMzUwMzEzMTQ1MDAw\\nWjBwMQswCQYDVQQGEwJVUzEXMBUGA1UECBMOTm9ydGggQ2Fyb2xpbmExDzANBgNV\\nBAcTBkR1cmhhbTEZMBcGA1UEChMQb3JnMS5leGFtcGxlLmNvbTEcMBoGA1UEAxMT\\nY2Eub3JnMS5leGFtcGxlLmNvbTBZMBMGByqGSM49AgEGCCqGSM49AwEHA0IABHic\\nzHXBRqfe7elvQ8zuxIwigOFCuk/49bjChQxf19fL/qHBLYLOXgd3Ox5jTVyyLuO/\\nf9x19piTv7gVgv8h7BijRTBDMA4GA1UdDwEB/wQEAwIBBjASBgNVHRMBAf8ECDAG\\nAQH/AgEBMB0GA1UdDgQWBBRGw4tXsbZSI45NZNTsDT7rssJpzjAKBggqhkjOPQQD\\nAgNHADBEAiBWNIFkaageeAiEMmhauY3bTHoG45Wgjk99CjHZ6KJoTgIgMfKc9mBL\\na5JHbGNB/gsBhxIm8/akE6g+SikIz/JGty4=\\n-----END CERTIFICATE-----\\n"\n');
        });

        it('should create a LifecyclePeer instance without a pem', () => {
            const peer: LifecyclePeer = new LifecyclePeer({
                url: 'grpc://localhost:7051',
                mspid: 'myMSPID',
                name: 'myPeer',
            });
            peer['url'].should.equal('grpc://localhost:7051');
            peer['mspid'].should.equal('myMSPID');
            peer['name'].should.equal('myPeer');
        });
    });

    describe('setCredentials', () => {
        it('should set the credentials for the peer', async () => {
            const peer: LifecyclePeer = new LifecyclePeer({
                url: 'grpcs://localhost:7051',
                mspid: 'myMSPID',
                name: 'myPeer',
                pem: '-----BEGIN CERTIFICATE-----\\nMIICJjCCAc2gAwIBAgIURY9F2Rt0JqOtiHbNJ6rRgfiDy2EwCgYIKoZIzj0EAwIw\\ncDELMAkGA1UEBhMCVVMxFzAVBgNVBAgTDk5vcnRoIENhcm9saW5hMQ8wDQYDVQQH\\nEwZEdXJoYW0xGTAXBgNVBAoTEG9yZzEuZXhhbXBsZS5jb20xHDAaBgNVBAMTE2Nh\\nLm9yZzEuZXhhbXBsZS5jb20wHhcNMjAwMzE2MTQ1MDAwWhcNMzUwMzEzMTQ1MDAw\\nWjBwMQswCQYDVQQGEwJVUzEXMBUGA1UECBMOTm9ydGggQ2Fyb2xpbmExDzANBgNV\\nBAcTBkR1cmhhbTEZMBcGA1UEChMQb3JnMS5leGFtcGxlLmNvbTEcMBoGA1UEAxMT\\nY2Eub3JnMS5leGFtcGxlLmNvbTBZMBMGByqGSM49AgEGCCqGSM49AwEHA0IABHic\\nzHXBRqfe7elvQ8zuxIwigOFCuk/49bjChQxf19fL/qHBLYLOXgd3Ox5jTVyyLuO/\\nf9x19piTv7gVgv8h7BijRTBDMA4GA1UdDwEB/wQEAwIBBjASBgNVHRMBAf8ECDAG\\nAQH/AgEBMB0GA1UdDgQWBBRGw4tXsbZSI45NZNTsDT7rssJpzjAKBggqhkjOPQQD\\nAgNHADBEAiBWNIFkaageeAiEMmhauY3bTHoG45Wgjk99CjHZ6KJoTgIgMfKc9mBL\\na5JHbGNB/gsBhxIm8/akE6g+SikIz/JGty4=\\n-----END CERTIFICATE-----\\n"\n'
            });

            const wallet: Wallet = await Wallets.newFileSystemWallet(path.join(__dirname, 'tmp', 'wallet'));

            peer.setCredentials(wallet, 'myIdentity');

            should.exist(peer['wallet']);
            // @ts-ignore
            peer['identity'].should.equal('myIdentity');
        });
    });

    describe('fabricFunctions', () => {

        let peer: LifecyclePeer;
        let peer2: LifecyclePeer;
        let wallet: Wallet;

        before(async () => {
            peer = new LifecyclePeer({
                url: 'grpcs://localhost:7051',
                mspid: 'myMSPID',
                name: 'myPeer',
                pem: '-----BEGIN CERTIFICATE-----\\nMIICJjCCAc2gAwIBAgIURY9F2Rt0JqOtiHbNJ6rRgfiDy2EwCgYIKoZIzj0EAwIw\\ncDELMAkGA1UEBhMCVVMxFzAVBgNVBAgTDk5vcnRoIENhcm9saW5hMQ8wDQYDVQQH\\nEwZEdXJoYW0xGTAXBgNVBAoTEG9yZzEuZXhhbXBsZS5jb20xHDAaBgNVBAMTE2Nh\\nLm9yZzEuZXhhbXBsZS5jb20wHhcNMjAwMzE2MTQ1MDAwWhcNMzUwMzEzMTQ1MDAw\\nWjBwMQswCQYDVQQGEwJVUzEXMBUGA1UECBMOTm9ydGggQ2Fyb2xpbmExDzANBgNV\\nBAcTBkR1cmhhbTEZMBcGA1UEChMQb3JnMS5leGFtcGxlLmNvbTEcMBoGA1UEAxMT\\nY2Eub3JnMS5leGFtcGxlLmNvbTBZMBMGByqGSM49AgEGCCqGSM49AwEHA0IABHic\\nzHXBRqfe7elvQ8zuxIwigOFCuk/49bjChQxf19fL/qHBLYLOXgd3Ox5jTVyyLuO/\\nf9x19piTv7gVgv8h7BijRTBDMA4GA1UdDwEB/wQEAwIBBjASBgNVHRMBAf8ECDAG\\nAQH/AgEBMB0GA1UdDgQWBBRGw4tXsbZSI45NZNTsDT7rssJpzjAKBggqhkjOPQQD\\nAgNHADBEAiBWNIFkaageeAiEMmhauY3bTHoG45Wgjk99CjHZ6KJoTgIgMfKc9mBL\\na5JHbGNB/gsBhxIm8/akE6g+SikIz/JGty4=\\n-----END CERTIFICATE-----\\n"\n',
                apiOptions: {
                    'grpc.some_option': 'some_value'
                }
            });

            peer2 = new LifecyclePeer({
                url: 'grpc://localhost:7051',
                mspid: 'myMSPID',
                name: 'myPeer2',
                sslTargetNameOverride: 'localhost'
            });

            wallet = await Wallets.newFileSystemWallet(path.join(__dirname, 'tmp', 'wallet'));

            const peerOrg1Identity: X509Identity = {
                credentials: {
                    certificate: '-----BEGIN CERTIFICATE-----\n' +
                        'MIICujCCAmGgAwIBAgIUUOge6hz++rKSbrV1Ya2t/kcC3s0wCgYIKoZIzj0EAwIw\n' +
                        'cDELMAkGA1UEBhMCVVMxFzAVBgNVBAgTDk5vcnRoIENhcm9saW5hMQ8wDQYDVQQH\n' +
                        'EwZEdXJoYW0xGTAXBgNVBAoTEG9yZzEuZXhhbXBsZS5jb20xHDAaBgNVBAMTE2Nh\n' +
                        'Lm9yZzEuZXhhbXBsZS5jb20wHhcNMjAwMzE3MTU0NzAwWhcNMjEwMzE3MTU1MjAw\n' +
                        'WjBgMQswCQYDVQQGEwJVUzEXMBUGA1UECBMOTm9ydGggQ2Fyb2xpbmExFDASBgNV\n' +
                        'BAoTC0h5cGVybGVkZ2VyMQ4wDAYDVQQLEwVhZG1pbjESMBAGA1UEAxMJb3JnMWFk\n' +
                        'bWluMFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEoELj0ASt7TpEAUNJjPkG7zNY\n' +
                        'wLMP3LDsFc38rWKm6ZRGtJIQ5k7jcoXXScuhS1YuRop/xKAvOhiLbd1hyo7fAqOB\n' +
                        '6DCB5TAOBgNVHQ8BAf8EBAMCB4AwDAYDVR0TAQH/BAIwADAdBgNVHQ4EFgQUEKQz\n' +
                        'qJPP/lPsRO7BizDnjJptylswHwYDVR0jBBgwFoAUSS9NU/qBB+Wx0R7PispddLmZ\n' +
                        'fd0wKAYDVR0RBCEwH4IdQ2Fyb2xpbmVzLU1hY0Jvb2stUHJvLTMubG9jYWwwWwYI\n' +
                        'KgMEBQYHCAEET3siYXR0cnMiOnsiaGYuQWZmaWxpYXRpb24iOiIiLCJoZi5FbnJv\n' +
                        'bGxtZW50SUQiOiJvcmcxYWRtaW4iLCJoZi5UeXBlIjoiYWRtaW4ifX0wCgYIKoZI\n' +
                        'zj0EAwIDRwAwRAIgHhpQYEAtQ9rPhvh4Wer3hKtuq7FChoqJWkj9rNdnbIkCIC4I\n' +
                        'GzjjS7hZRKsETRvIT3LRFTZJLJq6AcGOtepFso/n\n' +
                        '-----END CERTIFICATE-----',
                    privateKey: '-----BEGIN PRIVATE KEY-----\n' +
                        'MIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQgvprUzTpK7GBMXVvI\n' +
                        'NOlGgxyqqi1TM6CA63qNK8PTwfihRANCAASgQuPQBK3tOkQBQ0mM+QbvM1jAsw/c\n' +
                        'sOwVzfytYqbplEa0khDmTuNyhddJy6FLVi5Gin/EoC86GItt3WHKjt8C\n' +
                        '-----END PRIVATE KEY-----',
                },
                mspId: `myMSPID`,
                type: 'X.509',
            };

            await wallet.put('myIdentity', peerOrg1Identity);
        });

        describe('installSmartContractPackage', () => {
            let mysandbox: sinon.SinonSandbox;

            let buildRequest: any;
            const packageBuffer: Buffer = Buffer.from('mySmartContract');

            let endorserConnectStub: sinon.SinonStub;
            let endorsementBuildSpy: sinon.SinonSpy;
            let endorsementSignSpy: sinon.SinonSpy;
            let endorsementSendStub: sinon.SinonStub;

            beforeEach(() => {
                mysandbox = sinon.createSandbox();

                peer.setCredentials(wallet, 'myIdentity');
                peer['requestTimeout'] = undefined;

                peer2.setCredentials(wallet, 'myIdentity');
                peer2['requestTimeout'] = undefined;

                endorserConnectStub = mysandbox.stub(Endorser.prototype, 'connect').resolves();

                endorsementBuildSpy = mysandbox.spy(Endorsement.prototype, 'build');
                endorsementSignSpy = mysandbox.spy(Endorsement.prototype, 'sign');
                endorsementSendStub = mysandbox.stub(Endorsement.prototype, 'send');
                endorsementSendStub.resolves();

                const protoArgs: protos.lifecycle.IInstallChaincodeArgs = {};
                protoArgs.chaincode_install_package = packageBuffer;

                const arg: Uint8Array = protos.lifecycle.InstallChaincodeArgs.encode(protoArgs).finish();
                buildRequest = {
                    fcn: 'InstallChaincode',
                    args: [Buffer.from(arg)]
                };
            });

            afterEach(() => {
                mysandbox.restore();
            });

            it('should install the smart contract package', async () => {

                const encodedResult: Buffer = Buffer.from(protos.lifecycle.InstallChaincodeResult.encode({
                    package_id: 'myPackageId'
                }).finish());

                endorsementSendStub.resolves({
                    responses: [{
                        response: {
                            status: 200,
                            payload: encodedResult
                        }
                    }]
                });

                const result: string | undefined = await peer.installSmartContractPackage(packageBuffer);
                result!.should.equal('myPackageId');

                endorserConnectStub.should.have.been.called;
                endorsementBuildSpy.should.have.been.calledWith(sinon.match.instanceOf(IdentityContext), buildRequest);
                endorsementSignSpy.should.have.been.calledWith(sinon.match.instanceOf(IdentityContext));
                endorsementSendStub.should.have.been.calledWith({
                    targets: [sinon.match.instanceOf(Endorser)]
                });
            });

            it('should install the smart contract package using the timeout passed in', async () => {
                peer2['requestTimeout'] = 1234;
                const encodedResult: Buffer = Buffer.from(protos.lifecycle.InstallChaincodeResult.encode({
                    package_id: 'myPackageId'
                }).finish());

                endorsementSendStub.resolves({
                    responses: [{
                        response: {
                            status: 200,
                            payload: encodedResult
                        }
                    }]
                });

                const result: string | undefined = await peer2.installSmartContractPackage(packageBuffer, 4321);
                result!.should.equal('myPackageId');

                endorserConnectStub.should.have.been.called;
                endorsementBuildSpy.should.have.been.calledWith(sinon.match.instanceOf(IdentityContext), buildRequest);
                endorsementSignSpy.should.have.been.calledWith(sinon.match.instanceOf(IdentityContext));
                endorsementSendStub.should.have.been.calledWith({
                    targets: [sinon.match.instanceOf(Endorser)],
                    requestTimeout: 4321
                });
            });

            it('should install the smart contract package using the timeout', async () => {
                peer['requestTimeout'] = 1234;
                const encodedResult: Buffer = Buffer.from(protos.lifecycle.InstallChaincodeResult.encode({
                    package_id: 'myPackageId'
                }).finish());

                endorsementSendStub.resolves({
                    responses: [{
                        response: {
                            status: 200,
                            payload: encodedResult
                        }
                    }]
                });

                const result: string | undefined = await peer.installSmartContractPackage(packageBuffer);
                result!.should.equal('myPackageId');

                endorserConnectStub.should.have.been.called;
                endorsementBuildSpy.should.have.been.calledWith(sinon.match.instanceOf(IdentityContext), buildRequest);
                endorsementSignSpy.should.have.been.calledWith(sinon.match.instanceOf(IdentityContext));
                endorsementSendStub.should.have.been.calledWith({
                    targets: [sinon.match.instanceOf(Endorser)],
                    requestTimeout: 1234
                });
            });

            it('should handle buffer not being set', async () => {
                // @ts-ignore
                await peer.installSmartContractPackage().should.eventually.be.rejectedWith('parameter buffer missing');
            });

            it('should handle wallet or identity not being set', async () => {
                peer['wallet'] = undefined;
                peer['identity'] = undefined;
                await peer.installSmartContractPackage(packageBuffer).should.eventually.be.rejectedWith('Wallet or identity property not set, call setCredentials first');
            });

            it('should handle identity not being in the wallet', async () => {
                peer['identity'] = 'otherIdentity';
                await peer.installSmartContractPackage(packageBuffer).should.eventually.be.rejectedWith('Could not install smart contact received error: Identity otherIdentity does not exist in the wallet');
            });

            it('should handle errors in the response', async () => {
                endorsementSendStub.resolves({
                    errors: [new Error('some error')]
                });

                await peer.installSmartContractPackage(packageBuffer).should.eventually.be.rejectedWith('Could not install smart contact received error: some error');

                endorserConnectStub.should.have.been.called;
                endorsementBuildSpy.should.have.been.calledWith(sinon.match.instanceOf(IdentityContext), buildRequest);
                endorsementSignSpy.should.have.been.calledWith(sinon.match.instanceOf(IdentityContext));
                endorsementSendStub.should.have.been.calledWith({
                    targets: [sinon.match.instanceOf(Endorser)]
                });
            });

            it('should handle a non 200 status code', async () => {
                endorsementSendStub.resolves({
                    responses: [{
                        response: {
                            status: 400,
                            message: 'some error'
                        }
                    }]
                });

                await peer.installSmartContractPackage(packageBuffer).should.eventually.be.rejectedWith('Could not install smart contact received error: failed with status:400 ::some error');

                endorserConnectStub.should.have.been.called;
                endorsementBuildSpy.should.have.been.calledWith(sinon.match.instanceOf(IdentityContext), buildRequest);
                endorsementSignSpy.should.have.been.calledWith(sinon.match.instanceOf(IdentityContext));
                endorsementSendStub.should.have.been.calledWith({
                    targets: [sinon.match.instanceOf(Endorser)]
                });
            });

            it('should handle no response details', async () => {
                endorsementSendStub.resolves({
                    responses: [{
                        response: {}
                    }]
                });

                await peer.installSmartContractPackage(packageBuffer).should.eventually.be.rejectedWith('Could not install smart contact received error: failure in response');

                endorserConnectStub.should.have.been.called;
                endorsementBuildSpy.should.have.been.calledWith(sinon.match.instanceOf(IdentityContext), buildRequest);
                endorsementSignSpy.should.have.been.calledWith(sinon.match.instanceOf(IdentityContext));
                endorsementSendStub.should.have.been.calledWith({
                    targets: [sinon.match.instanceOf(Endorser)]
                });
            });

            it('should handle no response', async () => {
                endorsementSendStub.resolves({});

                await peer.installSmartContractPackage(packageBuffer).should.eventually.be.rejectedWith('Could not install smart contact received error: No response returned');

                endorserConnectStub.should.have.been.called;
                endorsementBuildSpy.should.have.been.calledWith(sinon.match.instanceOf(IdentityContext), buildRequest);
                endorsementSignSpy.should.have.been.calledWith(sinon.match.instanceOf(IdentityContext));
                endorsementSendStub.should.have.been.calledWith({
                    targets: [sinon.match.instanceOf(Endorser)]
                });
            });
        });

        describe('getAllInstalledSmartContracts', () => {
            let mysandbox: sinon.SinonSandbox;

            let buildRequest: any;

            let endorserConnectStub: sinon.SinonStub;
            let endorsementBuildSpy: sinon.SinonSpy;
            let endorsementSignSpy: sinon.SinonSpy;
            let endorsementSendStub: sinon.SinonStub;

            beforeEach(() => {
                mysandbox = sinon.createSandbox();

                peer.setCredentials(wallet, 'myIdentity');
                peer['requestTimeout'] = undefined;

                endorserConnectStub = mysandbox.stub(Endorser.prototype, 'connect').resolves();

                endorsementBuildSpy = mysandbox.spy(Endorsement.prototype, 'build');
                endorsementSignSpy = mysandbox.spy(Endorsement.prototype, 'sign');
                endorsementSendStub = mysandbox.stub(Endorsement.prototype, 'send');
                endorsementSendStub.resolves();

                const arg: Uint8Array = protos.lifecycle.QueryInstalledChaincodesArgs.encode({}).finish();

                buildRequest = {
                    fcn: 'QueryInstalledChaincodes',
                    args: [Buffer.from(arg)]
                };
            });

            afterEach(() => {
                mysandbox.restore();
            });

            it('should get all the installed smart contracts', async () => {

                const encodedResult: Buffer = Buffer.from(protos.lifecycle.QueryInstalledChaincodesResult.encode({
                    installed_chaincodes: [{
                        package_id: 'myPackageId',
                        label: 'myLabel'
                    }, {
                        package_id: 'anotherPackageId',
                        label: 'anotherLabel'
                    }]
                }).finish());

                endorsementSendStub.resolves({
                    responses: [{
                        response: {
                            status: 200,
                            payload: encodedResult
                        }
                    }]
                });

                const result: InstalledSmartContract[] = await peer.getAllInstalledSmartContracts();
                result.should.deep.equal([{ packageId: 'myPackageId', label: 'myLabel' }, {
                    packageId: 'anotherPackageId',
                    label: 'anotherLabel'
                }]);

                endorserConnectStub.should.have.been.called;
                endorsementBuildSpy.should.have.been.calledWith(sinon.match.instanceOf(IdentityContext), buildRequest);
                endorsementSignSpy.should.have.been.calledWith(sinon.match.instanceOf(IdentityContext));
                endorsementSendStub.should.have.been.calledWith({
                    targets: [sinon.match.instanceOf(Endorser)]
                });
            });

            it('should get installed the smart contract using the timeout passed in', async () => {
                peer['requestTimeout'] = 1234;

                const encodedResult: Buffer = Buffer.from(protos.lifecycle.QueryInstalledChaincodesResult.encode({
                    installed_chaincodes: [{
                        package_id: 'myPackageId',
                        label: 'myLabel'
                    }, {
                        package_id: 'anotherPackageId',
                        label: 'anotherLabel'
                    }]
                }).finish());

                endorsementSendStub.resolves({
                    responses: [{
                        response: {
                            status: 200,
                            payload: encodedResult
                        }
                    }]
                });

                const result: InstalledSmartContract[] = await peer.getAllInstalledSmartContracts(4321);
                result.should.deep.equal([{ packageId: 'myPackageId', label: 'myLabel' }, {
                    packageId: 'anotherPackageId',
                    label: 'anotherLabel'
                }]);

                endorserConnectStub.should.have.been.called;
                endorsementBuildSpy.should.have.been.calledWith(sinon.match.instanceOf(IdentityContext), buildRequest);
                endorsementSignSpy.should.have.been.calledWith(sinon.match.instanceOf(IdentityContext));
                endorsementSendStub.should.have.been.calledWith({
                    targets: [sinon.match.instanceOf(Endorser)],
                    requestTimeout: 4321
                });
            });

            it('should get the installed smart contracts using the timeout', async () => {
                peer['requestTimeout'] = 1234;

                const encodedResult: Buffer = Buffer.from(protos.lifecycle.QueryInstalledChaincodesResult.encode({
                    installed_chaincodes: [{
                        package_id: 'myPackageId',
                        label: 'myLabel'
                    }, {
                        package_id: 'anotherPackageId',
                        label: 'anotherLabel'
                    }]
                }).finish());

                endorsementSendStub.resolves({
                    responses: [{
                        response: {
                            status: 200,
                            payload: encodedResult
                        }
                    }]
                });

                const result: InstalledSmartContract[] = await peer.getAllInstalledSmartContracts();
                result.should.deep.equal([{ packageId: 'myPackageId', label: 'myLabel' }, {
                    packageId: 'anotherPackageId',
                    label: 'anotherLabel'
                }]);

                endorserConnectStub.should.have.been.called;
                endorsementBuildSpy.should.have.been.calledWith(sinon.match.instanceOf(IdentityContext), buildRequest);
                endorsementSignSpy.should.have.been.calledWith(sinon.match.instanceOf(IdentityContext));
                endorsementSendStub.should.have.been.calledWith({
                    targets: [sinon.match.instanceOf(Endorser)],
                    requestTimeout: 1234
                });
            });

            it('should handle wallet or identity not being set', async () => {
                peer['wallet'] = undefined;
                peer['identity'] = undefined;
                await peer.getAllInstalledSmartContracts().should.eventually.be.rejectedWith('Wallet or identity property not set, call setCredentials first');
            });

            it('should handle identity not being in the wallet', async () => {
                peer['identity'] = 'otherIdentity';
                await peer.getAllInstalledSmartContracts().should.eventually.be.rejectedWith('Could not get all the installed smart contract packages, received: Identity otherIdentity does not exist in the wallet');
            });

            it('should handle errors in the response', async () => {
                endorsementSendStub.resolves({
                    errors: [new Error('some error')]
                });

                await peer.getAllInstalledSmartContracts().should.eventually.be.rejectedWith('Could not get all the installed smart contract packages, received: some error');

                endorserConnectStub.should.have.been.called;
                endorsementBuildSpy.should.have.been.calledWith(sinon.match.instanceOf(IdentityContext), buildRequest);
                endorsementSignSpy.should.have.been.calledWith(sinon.match.instanceOf(IdentityContext));
                endorsementSendStub.should.have.been.calledWith({
                    targets: [sinon.match.instanceOf(Endorser)]
                });
            });

            it('should handle a non 200 status code', async () => {
                endorsementSendStub.resolves({
                    responses: [{
                        response: {
                            status: 400,
                            message: 'some error'
                        }
                    }]
                });

                await peer.getAllInstalledSmartContracts().should.eventually.be.rejectedWith('Could not get all the installed smart contract packages, received: failed with status:400 ::some error');

                endorserConnectStub.should.have.been.called;
                endorsementBuildSpy.should.have.been.calledWith(sinon.match.instanceOf(IdentityContext), buildRequest);
                endorsementSignSpy.should.have.been.calledWith(sinon.match.instanceOf(IdentityContext));
                endorsementSendStub.should.have.been.calledWith({
                    targets: [sinon.match.instanceOf(Endorser)]
                });
            });

            it('should handle no response details', async () => {
                endorsementSendStub.resolves({
                    responses: [{
                        response: {}
                    }]
                });

                await peer.getAllInstalledSmartContracts().should.eventually.be.rejectedWith('Could not get all the installed smart contract packages, received: failure in response');

                endorserConnectStub.should.have.been.called;
                endorsementBuildSpy.should.have.been.calledWith(sinon.match.instanceOf(IdentityContext), buildRequest);
                endorsementSignSpy.should.have.been.calledWith(sinon.match.instanceOf(IdentityContext));
                endorsementSendStub.should.have.been.calledWith({
                    targets: [sinon.match.instanceOf(Endorser)]
                });
            });

            it('should handle no response', async () => {
                endorsementSendStub.resolves({});

                await peer.getAllInstalledSmartContracts().should.eventually.be.rejectedWith('Could not get all the installed smart contract packages, received: No response returned');

                endorserConnectStub.should.have.been.called;
                endorsementBuildSpy.should.have.been.calledWith(sinon.match.instanceOf(IdentityContext), buildRequest);
                endorsementSignSpy.should.have.been.calledWith(sinon.match.instanceOf(IdentityContext));
                endorsementSendStub.should.have.been.calledWith({
                    targets: [sinon.match.instanceOf(Endorser)]
                });
            });
        });

        describe('getInstalledSmartContractPackage', () => {
            let mysandbox: sinon.SinonSandbox;

            let buildRequest: any;

            let endorserConnectStub: sinon.SinonStub;
            let endorsementBuildSpy: sinon.SinonSpy;
            let endorsementSignSpy: sinon.SinonSpy;
            let endorsementSendStub: sinon.SinonStub;

            beforeEach(() => {
                mysandbox = sinon.createSandbox();

                peer.setCredentials(wallet, 'myIdentity');
                peer['requestTimeout'] = undefined;

                endorserConnectStub = mysandbox.stub(Endorser.prototype, 'connect').resolves();

                endorsementBuildSpy = mysandbox.spy(Endorsement.prototype, 'build');
                endorsementSignSpy = mysandbox.spy(Endorsement.prototype, 'sign');
                endorsementSendStub = mysandbox.stub(Endorsement.prototype, 'send');
                endorsementSendStub.resolves();


                const protoArgs: protos.lifecycle.IGetInstalledChaincodePackageArgs = {};
                protoArgs.package_id = 'myPackageId';

                const arg: Uint8Array = protos.lifecycle.GetInstalledChaincodePackageArgs.encode(protoArgs).finish();

                buildRequest = {
                    fcn: 'GetInstalledChaincodePackage',
                    args: [Buffer.from(arg)]
                };
            });

            afterEach(() => {
                mysandbox.restore();
            });

            it('should get the installed smart contract package', async () => {
                const pkgData: Buffer = Buffer.from('myPackage');

                const encodedResult: Buffer = Buffer.from(protos.lifecycle.GetInstalledChaincodePackageResult.encode({
                    chaincode_install_package: pkgData
                }).finish());

                endorsementSendStub.resolves({
                    responses: [{
                        response: {
                            status: 200,
                            payload: encodedResult
                        }
                    }]
                });

                const result: Buffer = await peer.getInstalledSmartContractPackage('myPackageId');
                result.compare(pkgData).should.equal(0);

                endorserConnectStub.should.have.been.called;
                endorsementBuildSpy.should.have.been.calledWith(sinon.match.instanceOf(IdentityContext), buildRequest);
                endorsementSignSpy.should.have.been.calledWith(sinon.match.instanceOf(IdentityContext));
                endorsementSendStub.should.have.been.calledWith({
                    targets: [sinon.match.instanceOf(Endorser)]
                });
            });

            it('should get installed the smart contract using the timeout passed in', async () => {
                peer['requestTimeout'] = 1234;
                const pkgData: Buffer = Buffer.from('myPackage');
                const encodedResult: Buffer = Buffer.from(protos.lifecycle.GetInstalledChaincodePackageResult.encode({
                    chaincode_install_package: pkgData
                }).finish());

                endorsementSendStub.resolves({
                    responses: [{
                        response: {
                            status: 200,
                            payload: encodedResult
                        }
                    }]
                });

                const result: Buffer = await peer.getInstalledSmartContractPackage('myPackageId', 4321);
                result.compare(pkgData).should.equal(0);

                endorserConnectStub.should.have.been.called;
                endorsementBuildSpy.should.have.been.calledWith(sinon.match.instanceOf(IdentityContext), buildRequest);
                endorsementSignSpy.should.have.been.calledWith(sinon.match.instanceOf(IdentityContext));
                endorsementSendStub.should.have.been.calledWith({
                    targets: [sinon.match.instanceOf(Endorser)],
                    requestTimeout: 4321
                });
            });

            it('should get the installed smart contracts using the timeout', async () => {
                peer['requestTimeout'] = 1234;
                const pkgData: Buffer = Buffer.from('myPackage');
                const encodedResult: Buffer = Buffer.from(protos.lifecycle.GetInstalledChaincodePackageResult.encode({
                    chaincode_install_package: pkgData
                }).finish());

                endorsementSendStub.resolves({
                    responses: [{
                        response: {
                            status: 200,
                            payload: encodedResult
                        }
                    }]
                });

                const result: Buffer = await peer.getInstalledSmartContractPackage('myPackageId');
                result.compare(pkgData).should.equal(0);

                endorserConnectStub.should.have.been.called;
                endorsementBuildSpy.should.have.been.calledWith(sinon.match.instanceOf(IdentityContext), buildRequest);
                endorsementSignSpy.should.have.been.calledWith(sinon.match.instanceOf(IdentityContext));
                endorsementSendStub.should.have.been.calledWith({
                    targets: [sinon.match.instanceOf(Endorser)],
                    requestTimeout: 1234
                });
            });

            it('should handle packageId not being set', async () => {
                // @ts-ignore
                await peer.getInstalledSmartContractPackage().should.eventually.be.rejectedWith('parameter packageId missing');
            });

            it('should handle wallet or identity not being set', async () => {
                peer['wallet'] = undefined;
                peer['identity'] = undefined;
                await peer.getInstalledSmartContractPackage('myPackageId').should.eventually.be.rejectedWith('Wallet or identity property not set, call setCredentials first');
            });

            it('should handle identity not being in the wallet', async () => {
                peer['identity'] = 'otherIdentity';
                await peer.getInstalledSmartContractPackage('myPackageId').should.eventually.be.rejectedWith('Could not get the installed smart contract package, received: Identity otherIdentity does not exist in the wallet');
            });

            it('should handle errors in the response', async () => {
                endorsementSendStub.resolves({
                    errors: [new Error('some error')]
                });

                await peer.getInstalledSmartContractPackage('myPackageId').should.eventually.be.rejectedWith('Could not get the installed smart contract package, received: some error');

                endorserConnectStub.should.have.been.called;
                endorsementBuildSpy.should.have.been.calledWith(sinon.match.instanceOf(IdentityContext), buildRequest);
                endorsementSignSpy.should.have.been.calledWith(sinon.match.instanceOf(IdentityContext));
                endorsementSendStub.should.have.been.calledWith({
                    targets: [sinon.match.instanceOf(Endorser)]
                });
            });

            it('should handle a non 200 status code', async () => {
                endorsementSendStub.resolves({
                    responses: [{
                        response: {
                            status: 400,
                            message: 'some error'
                        }
                    }]
                });

                await peer.getInstalledSmartContractPackage('myPackageId').should.eventually.be.rejectedWith('Could not get the installed smart contract package, received: failed with status:400 ::some error');

                endorserConnectStub.should.have.been.called;
                endorsementBuildSpy.should.have.been.calledWith(sinon.match.instanceOf(IdentityContext), buildRequest);
                endorsementSignSpy.should.have.been.calledWith(sinon.match.instanceOf(IdentityContext));
                endorsementSendStub.should.have.been.calledWith({
                    targets: [sinon.match.instanceOf(Endorser)]
                });
            });

            it('should handle no response details', async () => {
                endorsementSendStub.resolves({
                    responses: [{
                        response: {}
                    }]
                });

                await peer.getInstalledSmartContractPackage('myPackageId').should.eventually.be.rejectedWith('Could not get the installed smart contract package, received: failure in response');

                endorserConnectStub.should.have.been.called;
                endorsementBuildSpy.should.have.been.calledWith(sinon.match.instanceOf(IdentityContext), buildRequest);
                endorsementSignSpy.should.have.been.calledWith(sinon.match.instanceOf(IdentityContext));
                endorsementSendStub.should.have.been.calledWith({
                    targets: [sinon.match.instanceOf(Endorser)]
                });
            });

            it('should handle no response', async () => {
                endorsementSendStub.resolves({});

                await peer.getInstalledSmartContractPackage('myPackageId').should.eventually.be.rejectedWith('Could not get the installed smart contract package, received: No response returned');

                endorserConnectStub.should.have.been.called;
                endorsementBuildSpy.should.have.been.calledWith(sinon.match.instanceOf(IdentityContext), buildRequest);
                endorsementSignSpy.should.have.been.calledWith(sinon.match.instanceOf(IdentityContext));
                endorsementSendStub.should.have.been.calledWith({
                    targets: [sinon.match.instanceOf(Endorser)]
                });
            });
        });

        describe('getAllChannelNames', () => {
            let mysandbox: sinon.SinonSandbox;

            let buildRequest: any;

            let endorserConnectStub: sinon.SinonStub;
            let endorsementBuildSpy: sinon.SinonSpy;
            let endorsementSignSpy: sinon.SinonSpy;
            let endorsementSendStub: sinon.SinonStub;

            beforeEach(() => {
                mysandbox = sinon.createSandbox();

                peer.setCredentials(wallet, 'myIdentity');
                peer['requestTimeout'] = undefined;

                endorserConnectStub = mysandbox.stub(Endorser.prototype, 'connect').resolves();

                endorsementBuildSpy = mysandbox.spy(Endorsement.prototype, 'build');
                endorsementSignSpy = mysandbox.spy(Endorsement.prototype, 'sign');
                endorsementSendStub = mysandbox.stub(Endorsement.prototype, 'send');
                endorsementSendStub.resolves();

                buildRequest = {
                    fcn: 'GetChannels',
                    args: []
                };
            });

            afterEach(() => {
                mysandbox.restore();
            });

            it('should get all the channel names', async () => {


                const encodedResult: Buffer = Buffer.from(protos.protos.ChannelQueryResponse.encode({
                    channels: [{
                        channel_id: 'mychannel'
                    }, {
                        channel_id: 'anotherchannel'
                    }]
                }).finish());

                endorsementSendStub.resolves({
                    responses: [{
                        response: {
                            status: 200,
                            payload: encodedResult
                        }
                    }]
                });

                const result: string[] = await peer.getAllChannelNames();
                result.should.deep.equal(['mychannel', 'anotherchannel']);

                endorserConnectStub.should.have.been.called;
                endorsementBuildSpy.should.have.been.calledWith(sinon.match.instanceOf(IdentityContext), buildRequest);
                endorsementSignSpy.should.have.been.calledWith(sinon.match.instanceOf(IdentityContext));
                endorsementSendStub.should.have.been.calledWith({
                    targets: [sinon.match.instanceOf(Endorser)]
                });
            });

            it('should all the channel names using the timeout passed in', async () => {
                peer['requestTimeout'] = 1234;

                const encodedResult: Buffer = Buffer.from(protos.protos.ChannelQueryResponse.encode({
                    channels: [{
                        channel_id: 'mychannel'
                    }, {
                        channel_id: 'anotherchannel'
                    }]
                }).finish());

                endorsementSendStub.resolves({
                    responses: [{
                        response: {
                            status: 200,
                            payload: encodedResult
                        }
                    }]
                });

                const result: string[] = await peer.getAllChannelNames(4321);
                result.should.deep.equal(['mychannel', 'anotherchannel']);

                endorserConnectStub.should.have.been.called;
                endorsementBuildSpy.should.have.been.calledWith(sinon.match.instanceOf(IdentityContext), buildRequest);
                endorsementSignSpy.should.have.been.calledWith(sinon.match.instanceOf(IdentityContext));
                endorsementSendStub.should.have.been.calledWith({
                    targets: [sinon.match.instanceOf(Endorser)],
                    requestTimeout: 4321
                });
            });

            it('should get all the channel using the timeout', async () => {
                peer['requestTimeout'] = 1234;
                const encodedResult: Buffer = Buffer.from(protos.protos.ChannelQueryResponse.encode({
                    channels: [{
                        channel_id: 'mychannel'
                    }, {
                        channel_id: 'anotherchannel'
                    }]
                }).finish());

                endorsementSendStub.resolves({
                    responses: [{
                        response: {
                            status: 200,
                            payload: encodedResult
                        }
                    }]
                });

                const result: string[] = await peer.getAllChannelNames();
                result.should.deep.equal(['mychannel', 'anotherchannel']);

                endorserConnectStub.should.have.been.called;
                endorsementBuildSpy.should.have.been.calledWith(sinon.match.instanceOf(IdentityContext), buildRequest);
                endorsementSignSpy.should.have.been.calledWith(sinon.match.instanceOf(IdentityContext));
                endorsementSendStub.should.have.been.calledWith({
                    targets: [sinon.match.instanceOf(Endorser)],
                    requestTimeout: 1234
                });
            });

            it('should handle wallet or identity not being set', async () => {
                peer['wallet'] = undefined;
                peer['identity'] = undefined;
                await peer.getAllChannelNames().should.eventually.be.rejectedWith('Wallet or identity property not set, call setCredentials first');
            });

            it('should handle identity not being in the wallet', async () => {
                peer['identity'] = 'otherIdentity';
                await peer.getAllChannelNames().should.eventually.be.rejectedWith('Could not get all channel names, received: Identity otherIdentity does not exist in the wallet');
            });

            it('should handle errors in the response', async () => {
                endorsementSendStub.resolves({
                    errors: [new Error('some error')]
                });

                await peer.getAllChannelNames().should.eventually.be.rejectedWith('Could not get all channel names, received: some error');

                endorserConnectStub.should.have.been.called;
                endorsementBuildSpy.should.have.been.calledWith(sinon.match.instanceOf(IdentityContext), buildRequest);
                endorsementSignSpy.should.have.been.calledWith(sinon.match.instanceOf(IdentityContext));
                endorsementSendStub.should.have.been.calledWith({
                    targets: [sinon.match.instanceOf(Endorser)]
                });
            });

            it('should handle a non 200 status code', async () => {
                endorsementSendStub.resolves({
                    responses: [{
                        response: {
                            status: 400,
                            message: 'some error'
                        }
                    }]
                });

                await peer.getAllChannelNames().should.eventually.be.rejectedWith('Could not get all channel names, received: failed with status:400 ::some error');

                endorserConnectStub.should.have.been.called;
                endorsementBuildSpy.should.have.been.calledWith(sinon.match.instanceOf(IdentityContext), buildRequest);
                endorsementSignSpy.should.have.been.calledWith(sinon.match.instanceOf(IdentityContext));
                endorsementSendStub.should.have.been.calledWith({
                    targets: [sinon.match.instanceOf(Endorser)]
                });
            });

            it('should handle no response details', async () => {
                endorsementSendStub.resolves({
                    responses: [{
                        response: {}
                    }]
                });

                await peer.getAllChannelNames().should.eventually.be.rejectedWith('Could not get all channel names, received: failure in response');

                endorserConnectStub.should.have.been.called;
                endorsementBuildSpy.should.have.been.calledWith(sinon.match.instanceOf(IdentityContext), buildRequest);
                endorsementSignSpy.should.have.been.calledWith(sinon.match.instanceOf(IdentityContext));
                endorsementSendStub.should.have.been.calledWith({
                    targets: [sinon.match.instanceOf(Endorser)]
                });
            });

            it('should handle no response', async () => {
                endorsementSendStub.resolves({});

                await peer.getAllChannelNames().should.eventually.be.rejectedWith('Could not get all channel names, received: No response returned');

                endorserConnectStub.should.have.been.called;
                endorsementBuildSpy.should.have.been.calledWith(sinon.match.instanceOf(IdentityContext), buildRequest);
                endorsementSignSpy.should.have.been.calledWith(sinon.match.instanceOf(IdentityContext));
                endorsementSendStub.should.have.been.calledWith({
                    targets: [sinon.match.instanceOf(Endorser)]
                });
            });
        });
    });
});
