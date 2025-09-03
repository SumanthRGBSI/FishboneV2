import { Component } from "@angular/core";
import { FishboneComponent } from "./fishbone.component";

@Component({
  selector: "app-root",
  imports: [FishboneComponent],
  template: `<app-fishbone></app-fishbone>`,
  styleUrl: "./app.css",
})
export class App {}
