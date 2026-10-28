import { ApiService } from "./api.service";
import type { LocalContext } from "@/store/local.store";

export const LocalService = {
    list: async () => (await ApiService.get<LocalContext[]>("/locals")).data,
    current: async () => (await ApiService.get<LocalContext>("/locals/current")).data,
};
