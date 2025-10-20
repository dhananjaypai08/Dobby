import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("CLOBModule", (m) => {
  const clob = m.contract("CLOB");
  return { clob };

});
