import { ethers, run, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

dotenv.config({ path: "../../.env" });

async function main() {
    console.log(`Deploying HTLCEvm on ${network.name}...`);
    const [deployer] = await ethers.getSigners();
    console.log("Deploying contracts with the account:", deployer.address);

    const HTLCEvm = await ethers.getContractFactory("HTLCEvm");
    const htlc = await HTLCEvm.deploy();
    await htlc.waitForDeployment();
    const htlcAddress = await htlc.getAddress();

    console.log(`HTLCEvm deployed to: ${htlcAddress}`);

    const envPath = path.join(__dirname, "../../../.env");
    let envContent = "";
    if (fs.existsSync(envPath)) {
        envContent = fs.readFileSync(envPath, "utf-8");
    }

    const envVarRegex = new RegExp(`^HTLC_EVM_ADDRESS_${network.name.toUpperCase().replaceAll("-", "_")}=.*$`, "m");
    const newEnvVar = `HTLC_EVM_ADDRESS_${network.name.toUpperCase().replaceAll("-", "_")}=${htlcAddress}`;

    if (envVarRegex.test(envContent)) {
        envContent = envContent.replace(envVarRegex, newEnvVar);
    } else {
        if (envContent && !envContent.endsWith("\n")) {
            envContent += "\n";
        }
        envContent += newEnvVar + "\n";
    }

    fs.writeFileSync(envPath, envContent);
    console.log(`Saved ${newEnvVar} to ${envPath}`);

    if (network.name !== "hardhat" && network.name !== "localhost") {
        console.log("Waiting for 5 block confirmations...");
        // @ts-ignore
        await htlc.deploymentTransaction()?.wait(5);

        console.log("Verifying contract on block explorer...");
        try {
            await run("verify:verify", {
                address: htlcAddress,
                constructorArguments: [],
            });
            console.log("Verification successful!");
        } catch (e: any) {
            if (e.message.toLowerCase().includes("already verified")) {
                console.log("Contract is already verified!");
            } else {
                console.error("Verification failed:", e);
            }
        }
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
