import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("TokenModule", (m) => {
  const token1 = m.contract("Token", ["Origami", "OG", "100000000000000000000"], { id: "TokenIdv1" });
  const token2 = m.contract("Token", ["Lamal", "LML", "50000000000000000000"], { id: "TokenId2_v1" });
  return { token1, token2 };

});
