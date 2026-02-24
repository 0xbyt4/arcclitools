import { readFileSync } from "fs";
import { basename } from "path";
import { requirePinataJWT } from "../config/env.js";

const PINATA_API_URL = "https://api.pinata.cloud";

interface PinataResponse {
  IpfsHash: string;
  PinSize: number;
  Timestamp: string;
}

export async function uploadFileToPinata(
  filePath: string
): Promise<{ cid: string; uri: string; gatewayUrl: string }> {
  const jwt = requirePinataJWT();
  const fileData = readFileSync(filePath);
  const fileName = basename(filePath);

  const formData = new FormData();
  const blob = new Blob([fileData]);
  formData.append("file", blob, fileName);

  const metadata = JSON.stringify({ name: fileName });
  formData.append("pinataMetadata", metadata);

  const response = await fetch(`${PINATA_API_URL}/pinning/pinFileToIPFS`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${jwt}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Pinata upload failed (${response.status}): ${errorText}`);
  }

  const data = (await response.json()) as PinataResponse;

  return {
    cid: data.IpfsHash,
    uri: `ipfs://${data.IpfsHash}`,
    gatewayUrl: `https://gateway.pinata.cloud/ipfs/${data.IpfsHash}`,
  };
}

export async function uploadJSONToPinata(
  json: Record<string, unknown>,
  name: string
): Promise<{ cid: string; uri: string; gatewayUrl: string }> {
  const jwt = requirePinataJWT();

  const response = await fetch(`${PINATA_API_URL}/pinning/pinJSONToIPFS`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${jwt}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      pinataContent: json,
      pinataMetadata: { name },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Pinata upload failed (${response.status}): ${errorText}`);
  }

  const data = (await response.json()) as PinataResponse;

  return {
    cid: data.IpfsHash,
    uri: `ipfs://${data.IpfsHash}`,
    gatewayUrl: `https://gateway.pinata.cloud/ipfs/${data.IpfsHash}`,
  };
}

export async function testPinataConnection(): Promise<boolean> {
  const jwt = requirePinataJWT();

  const response = await fetch(`${PINATA_API_URL}/data/testAuthentication`, {
    headers: {
      Authorization: `Bearer ${jwt}`,
    },
  });

  return response.ok;
}
