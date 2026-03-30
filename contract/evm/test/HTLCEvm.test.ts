import { expect } from "chai";
import { ethers } from "hardhat";
import { HTLCEvm } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { Contract } from "ethers";

const createHashlock = (preimage: string) => {
    return ethers.sha256(preimage);
};

describe("HTLCEvm", function () {
    let htlc: HTLCEvm;
    let token: Contract;
    let owner: SignerWithAddress;
    let sender: SignerWithAddress;
    let receiver: SignerWithAddress;

    const amount = ethers.parseUnits("100", 18);
    const secret = "my_super_secret_preimage";
    const bytes32Preimage = ethers.encodeBytes32String(secret);
    const hashlock = createHashlock(bytes32Preimage);
    let lockId: string;
    let timelock: number;

    beforeEach(async function () {
        [owner, sender, receiver] = await ethers.getSigners();

        const TokenFactory = await ethers.getContractFactory("MockERC20", owner);
        token = await TokenFactory.deploy();
        await token.waitForDeployment();
        const tokenAddress = await token.getAddress();

        await token.connect(owner).getFunction("mint")(sender.address, amount * 10n);

        const HTLCFactory = await ethers.getContractFactory("HTLCEvm");
        htlc = await HTLCFactory.deploy();
        await htlc.waitForDeployment();

        const htlcAddress = await htlc.getAddress();

        await token.connect(sender).getFunction("approve")(htlcAddress, amount * 10n);

        const latestTime = await time.latest();
        timelock = latestTime + 3600;
    });

    describe("Lock", function () {
        it("lock() happy path: Lock ERC20 tokens, verify event emitted, contract balance", async function () {
            const htlcAddress = await htlc.getAddress();
            const tokenAddress = await token.getAddress();

            const senderInitialBal = await token.getFunction("balanceOf")(sender.address);
            const htlcInitialBal = await token.getFunction("balanceOf")(htlcAddress);

            const tx = await htlc.connect(sender).lock(
                receiver.address,
                tokenAddress,
                amount,
                hashlock,
                timelock
            );

            const receipt = await tx.wait();
            if (!receipt) throw new Error("No receipt");

            const event = htlc.interface.parseLog(receipt.logs[1] as any);
            expect(event?.name).to.equal("Locked");
            
            lockId = event?.args[0];

            expect(event?.args[1]).to.equal(sender.address);
            expect(event?.args[2]).to.equal(receiver.address);
            expect(event?.args[3]).to.equal(amount);

            const senderFinalBal = await token.getFunction("balanceOf")(sender.address);
            const htlcFinalBal = await token.getFunction("balanceOf")(htlcAddress);

            expect(senderInitialBal - senderFinalBal).to.equal(amount);
            expect(htlcFinalBal - htlcInitialBal).to.equal(amount);

            const lockEntry = await htlc.locks(lockId);
            expect(lockEntry.sender).to.equal(sender.address);
            expect(lockEntry.receiver).to.equal(receiver.address);
            expect(lockEntry.amount).to.equal(amount);
            expect(lockEntry.withdrawn).to.be.false;
            expect(lockEntry.refunded).to.be.false;
        });

        it("Reject zero amount: lock() with amount 0 reverts", async function () {
            const tokenAddress = await token.getAddress();
            await expect(
                htlc.connect(sender).lock(receiver.address, tokenAddress, 0n, hashlock, timelock)
            ).to.be.revertedWith("amount must be positive");
        });

        it("Reject past timelock: lock() with expired timelock reverts", async function () {
            const tokenAddress = await token.getAddress();
            const latestTime = await time.latest();
            await expect(
                htlc.connect(sender).lock(receiver.address, tokenAddress, amount, hashlock, latestTime - 1)
            ).to.be.revertedWith("timelock must be future");
        });
    });

    describe("Withdraw & Refund", function () {
        let currentLockId: string;

        beforeEach(async function () {
            const tokenAddress = await token.getAddress();

            const tx = await htlc.connect(sender).lock(
                receiver.address,
                tokenAddress,
                amount,
                hashlock,
                timelock
            );
            const receipt = await tx.wait();
            if (!receipt) throw new Error("No receipt");
            const event = htlc.interface.parseLog(receipt.logs[1] as any);
            currentLockId = event?.args[0];
        });

        it("withdraw() with correct preimage: Reveal secret, verify receiver gets tokens", async function () {
            const tokenAddress = await token.getAddress();
            const receiverInitialBal = await token.getFunction("balanceOf")(receiver.address);
            const bytes32Preimage = ethers.encodeBytes32String(secret);
            const specificHashlock = ethers.sha256(bytes32Preimage);

            const tx = await htlc.connect(sender).lock(
                receiver.address,
                tokenAddress,
                amount,
                specificHashlock,
                timelock + 100
            );
            const receipt = await tx.wait();
            if (!receipt) throw new Error("No receipt");
            const event = htlc.interface.parseLog(receipt.logs[1] as any);
            const newLockId = event?.args[0];

            await expect(htlc.connect(receiver).withdraw(newLockId, bytes32Preimage))
                .to.emit(htlc, "Withdrawn")
                .withArgs(newLockId, bytes32Preimage);

            const receiverFinalBal = await token.getFunction("balanceOf")(receiver.address);
            expect(receiverFinalBal - receiverInitialBal).to.equal(amount);

            const lockEntry = await htlc.locks(newLockId);
            expect(lockEntry.withdrawn).to.be.true;
        });

        it("Reject wrong preimage: withdraw() with wrong secret reverts", async function () {
            const wrongSecret = ethers.encodeBytes32String("wrong_secret");
            await expect(
                htlc.connect(receiver).withdraw(currentLockId, wrongSecret)
            ).to.be.revertedWithCustomError(htlc, "InvalidPreimage");
        });

        it("Reject withdraw after expiry: withdraw() after timelock reverts", async function () {
            const tokenAddress = await token.getAddress();
            const bytes32Preimage = ethers.encodeBytes32String(secret);
            const specificHashlock = ethers.sha256(bytes32Preimage);

            const tx = await htlc.connect(sender).lock(
                receiver.address,
                tokenAddress,
                amount,
                specificHashlock,
                timelock + 200
            );
            const receipt = await tx.wait();

            // @ts-ignore
            const newLockId = receipt?.logs.find((e: any) => e.fragment?.name === "Locked")?.args[0];

            await time.increaseTo(timelock + 201);

            await expect(
                htlc.connect(receiver).withdraw(newLockId, bytes32Preimage)
            ).to.be.revertedWithCustomError(htlc, "LockExpired");
        });

        it("refund() after expiry: Fast-forward time, verify sender gets tokens back", async function () {
            const senderInitialBal = await token.getFunction("balanceOf")(sender.address);

            await time.increaseTo(timelock + 1);

            await expect(htlc.connect(sender).refund(currentLockId))
                .to.emit(htlc, "Refunded")
                .withArgs(currentLockId);

            const senderFinalBal = await token.getFunction("balanceOf")(sender.address);
            expect(senderFinalBal - senderInitialBal).to.equal(amount);

            const lockEntry = await htlc.locks(currentLockId);
            expect(lockEntry.refunded).to.be.true;
        });

        it("Reject early refund: refund() before timelock reverts", async function () {
            await expect(
                htlc.connect(sender).refund(currentLockId)
            ).to.be.revertedWithCustomError(htlc, "NotYetExpired");
        });

        it("Reject double withdraw: Second withdraw() reverts", async function () {
            const tokenAddress = await token.getAddress();
            const bytes32Preimage = ethers.encodeBytes32String("test_secret");
            const specificHashlock = ethers.sha256(bytes32Preimage);

            const tx = await htlc.connect(sender).lock(
                receiver.address,
                tokenAddress,
                amount,
                specificHashlock,
                timelock + 500
            );
            const receipt = await tx.wait();

            // @ts-ignore
            const newLockId = receipt?.logs.find((e: any) => e.fragment?.name === "Locked")?.args[0];

            await htlc.connect(receiver).withdraw(newLockId, bytes32Preimage);

            await expect(
                htlc.connect(receiver).withdraw(newLockId, bytes32Preimage)
            ).to.be.revertedWithCustomError(htlc, "AlreadyWithdrawn");
        });

        it("Reject double refund: Second refund() reverts", async function () {
            await time.increaseTo(timelock + 1);

            await htlc.connect(sender).refund(currentLockId);

            await expect(
                htlc.connect(sender).refund(currentLockId)
            ).to.be.revertedWithCustomError(htlc, "AlreadyRefunded");
        });
    });
});
