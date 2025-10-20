import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("TokenModule", (m) => {
  // Sequential deployment: token2 waits for token1 via after.
  const token1 = m.contract("Token", ["Origami", "OG", "100000000000000000000"], { id: "TokenId1_v001" });
  const token2 = m.contract("Token", ["Lamal", "LML", "50000000000000000000"], { id: "TokenId2_v001", after: [token1] });
  return { token1, token2 };
});
