import {
  PoolConfiguration,
} from "./types";
import BendConfig from "../configs/bend";
import { CommonsConfig } from "../configs/commons";

export enum ConfigNames {
  Commons = "Commons",
  Bend = "Bend",
}

export const loadPoolConfig = (configName: ConfigNames): PoolConfiguration => {
  switch (configName) {
    case ConfigNames.Bend:
      return BendConfig;
    case ConfigNames.Commons:
      return CommonsConfig;
    default:
      throw new Error(`Unsupported pool configuration: ${Object.values(ConfigNames)}`);
  }
};
