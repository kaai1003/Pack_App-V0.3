import { Component, OnInit } from '@angular/core';
import { StorageService } from '../../../services/storage.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-display-top-info',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './display-top-info.component.html',
  styleUrl: './display-top-info.component.css'
})
export class DisplayTopInfoComponent implements OnInit {
  currentTime: Date = new Date();

  constructor(public storageService: StorageService) { }

  ngOnInit(): void {
    setInterval(() => {
      this.currentTime = new Date();
    }, 1000);
  }
}
