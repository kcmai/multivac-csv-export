import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";

@Injectable({
  providedIn: "root"
})
export class RecordService {
  uri:string = "https://multivac-csv-export.herokuapp.com";

  constructor(private httpClient: HttpClient) { }

  checkIfValidAddress(address: string) {
    return this.httpClient.get(`${this.uri}/checkIfValidAddress/${address}`);
  }

  addGenerateRecordJob(address: string, currency: string) {
    return this.httpClient.get(`${this.uri}/addGenerateRecordJob/${address}/${currency}`);
  }

  checkOnJobProgress(jobId: string) {
    return this.httpClient.get(`${this.uri}/checkOnJobProgress/${jobId}`);
  }
}
