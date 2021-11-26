import { Component, OnInit } from "@angular/core";
import { RecordService } from "../services/record.service";
import { AngularCsv } from "angular-csv-ext/dist/Angular-csv";
import { lastValueFrom } from "rxjs";

@Component({
  selector: "app-home",
  templateUrl: "./home.component.html",
  styleUrls: ["./home.component.scss"]
})
export class HomeComponent implements OnInit {
  txRecords: any = [];
  currency: string = "USD";
  loadingReport: boolean = false;
  showReport: boolean = false;
  showAddressDoesNotExist: boolean = false;
  addressProfile: any = {
    address: null,
    mainnetBalance: 0,
    totalStaked: 0,
    stakeRank: null,
    receivedRewardAmount: 0,
    pendingWithdrawal: 0
  };

  constructor(private recordService: RecordService) { }

  ngOnInit(): void {
  }

  async buildReport(addressForm: any): Promise<void> {
    let generateReport = document.getElementById("generateReport-btn") as HTMLButtonElement;
    generateReport.disabled = true;
    setTimeout(() => { generateReport.disabled = false; }, 1000);

    this.loadingReport = true;
    this.showReport = false;
    this.showAddressDoesNotExist = false;

    try {
      const isValidAddress = await lastValueFrom(this.recordService.checkIfValidAddress(addressForm.address))
      if (!isValidAddress) {
        throw "Address does not exist"
      }

      const socket = new WebSocket("wss://multivac-csv-export.herokuapp.com");
      socket.onopen = async () => {
        socket.send(JSON.stringify({
          "address": addressForm.address,
          "currency": addressForm.currency
        }));
      }

      socket.addEventListener("message", (event,) => {
        this.addressProfile = JSON.parse(event.data)["addressProfile"]
        this.txRecords = JSON.parse(event.data)["txRecords"]
        this.currency = addressForm.currency
        this.loadingReport = false;
        this.showReport = true;
        socket.close();
      });
    } catch (error) {
      this.loadingReport = false;
      this.showAddressDoesNotExist = true;
    }
  }

  downloadCsvReport() {
    const options = {
      showLabels: true,
      headers: ["Timestamp(UTC)", "Id", "Amount(MTV)", `Price(${this.currency})`, `Total Value(${this.currency})`],
    };

    let downloadCsv = document.getElementById("downloadCsv-btn") as HTMLButtonElement;
    downloadCsv.disabled = true;
    setTimeout(() => { downloadCsv.disabled = false; }, 2000);
    new AngularCsv(this.txRecords, "txRecords", options);
  }
}