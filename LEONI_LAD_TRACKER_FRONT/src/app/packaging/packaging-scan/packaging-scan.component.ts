import { AfterViewInit, Component, ElementRef, HostListener, input, OnInit, ViewChild } from '@angular/core';
import { MatStepper, MatStepperModule } from "@angular/material/stepper";
import {
  BehaviorSubject,
  concatMap,
  debounce,
  debounceTime,
  firstValueFrom,
  map,
  of,
  queueScheduler,
  switchMap
} from "rxjs";
import { catchError, tap } from "rxjs/operators";
import { PackagingBoxDto } from "../../dtos/packaging-box.dto";
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from "@angular/forms";
import { MatFormFieldModule, MatLabel } from "@angular/material/form-field";
import Chart from "chart.js/auto";
import { PackagingProcess } from "../../models/packaging.proccess.model";
import { PackagingProcessService } from "../../services/packaging-proccess.service";
import { AsyncPipe, DatePipe, NgForOf } from "@angular/common";
import { PackagingStep } from "../../models/packaging.step.model";
import { HarnessService } from "../../services/harness.service";
import { PackagingBoxService } from "../../services/packaging.box.service";
import { ProdHarnessService } from "../../services/prod-harness.service";
import { MatSnackBar } from "@angular/material/snack-bar";
import { CreateProdHarnessDTO } from '../../dtos/create-prod-harness.dto';
import { StorageService } from '../../services/storage.service';
import { LineDashboardService } from '../../services/line.dashboard';
import { CountHourLineDto } from '../../dtos/Line.dashboard.dto';
import { LineDisplayDialogComponent } from '../line-display-dialog/line-display-dialog.component';
import { MatDialog } from '@angular/material/dialog';
import { PrintingService } from '../../services/printer-service';
import { PrintLabelRequest } from '../../dtos/settings.dto';
import { AuthServiceService } from '../../services/auth-service.service';
import { HarnessModel } from '../../models/harness.model';

@Component({
  selector: 'app-packaging-scan',
  standalone: true,
  imports: [MatStepperModule, FormsModule, ReactiveFormsModule, MatFormFieldModule, AsyncPipe, NgForOf, DatePipe],
  templateUrl: './packaging-scan.component.html',
  styleUrls: ['./packaging-scan.component.css']
})
export class PackagingScanComponent implements OnInit, AfterViewInit {

  isEditable: boolean = true;
  currentUuid: BehaviorSubject<string> = new BehaviorSubject<string>("");
  blankObjet = {} as HarnessModel;
  packagingBox: BehaviorSubject<PackagingBoxDto> = new BehaviorSubject<PackagingBoxDto>({
    id: 0,
    barcode: "",
    created_by: "1",
    harness_id: 0,
    to_be_delivered_quantity: 0,
    delivered_quantity: 0,
    line_id: 1,
    status: 0,
    harness: this.blankObjet
  });
  currentStep: BehaviorSubject<number> = new BehaviorSubject<number>(1);
  packagingForm: FormGroup;
  lastChangedControl: { name: string, value: any } | null = null;
  packagingProcess: BehaviorSubject<PackagingProcess> = new BehaviorSubject<PackagingProcess>({
    id: 1, segmentId: 1, segment: null, status: 1, name: "Sample Packaging Process", steps: []
  });
  packagingSteps: BehaviorSubject<PackagingStep[]> = new BehaviorSubject<PackagingStep[]>([]);
  packagingStepsAll: BehaviorSubject<PackagingStep[]> = new BehaviorSubject<PackagingStep[]>([]);
  loopsSteps: BehaviorSubject<PackagingStep[]> = new BehaviorSubject<PackagingStep[]>([]);
  prodHarness!: CreateProdHarnessDTO;
  currentRef: BehaviorSubject<string> = new BehaviorSubject<string>("");
  activeStep: BehaviorSubject<number> = new BehaviorSubject<number>(0);
  currentCounter: BehaviorSubject<string> = new BehaviorSubject<string>("");
  currentBoxSize: string = "";
  isPackagingStepTerminate: boolean = false;
  currentTime: Date = new Date();
  @ViewChild('labelInput') labelInput!: ElementRef;
  @ViewChild(MatStepper) stepper!: MatStepper;
  filterForm: FormGroup = this.formBuilder.group({
    from: [this.formatDate(new Date()), Validators.required], to: [this.formatDate(new Date()), Validators.required]
  });
  countFxPerHour: CountHourLineDto[] = [];
  totalOfDeliveredHarnessPerShift: number = 0;
  private chart: Chart | undefined;
  @ViewChild('myPieChart') private pieChartRef!: ElementRef;
  openedBoxes: BehaviorSubject<PackagingBoxDto[]> = new BehaviorSubject<PackagingBoxDto[]>([]);

  constructor(private formBuilder: FormBuilder, private snackBar: MatSnackBar, private packagingProcessService: PackagingProcessService, private packagingBoxService: PackagingBoxService, private prodHarnessService: ProdHarnessService, public storageService: StorageService, private dialog: MatDialog, private printerService: PrintingService, public authService: AuthServiceService, private lineDashboardService: LineDashboardService, private harnessService: HarnessService) {
    this.packagingForm = this.formBuilder.group({
      label: ["", Validators.required]
    });
  }

  /**
   *
   */
  ngOnInit(): void {
    this.packagingForm.get('label')?.valueChanges.pipe(
      debounceTime(1000),
      tap(value => {
        if (value != "" && value === this.storageService.getItem('current_box_prefix') + this.packagingBox.getValue().barcode) {
          this.stepper.reset()
          window.location.reload();
        } else {
          this.packagingForm.get('label')?.reset()
          this.snackBar.open("value not correct", "OK", { duration: 3000 })
        }
      })).subscribe()
    this.setDefaultDates()
    const selectedPackagingProcess = this.storageService.getItem("process_id");
    if (isNaN(selectedPackagingProcess)) {
      this.snackBar.open("Select packaging process to preform operation")
    } else {
      this.packagingProcessService.getProcessById(selectedPackagingProcess).pipe(
        tap((packagingProcess: PackagingProcess) => {
          let packagingStepsAll = packagingProcess.steps.sort((a, b) => a.order - b.order);
          let packagingSteps = packagingProcess.steps.filter(step => step.name.includes('packaging')).sort((a, b) => a.order - b.order);
          let loopSteps = packagingProcess.steps.filter(step => !step.name.includes('packaging')).sort((a, b) => a.order - b.order);
          this.loopsSteps.next(loopSteps);
          this.packagingProcess.next(packagingProcess)
          this.packagingSteps.next(packagingSteps);
          this.packagingStepsAll.next(packagingStepsAll);
          packagingProcess.steps.forEach(step => {
            const controlName = step.name;
            this.packagingForm.addControl(controlName, this.formBuilder.control({
              value: '', disabled: false
            }, [Validators.required, Validators.minLength(2)]));
            // Subscribe to valueChanges for each control
            this.packagingForm.get(controlName)?.valueChanges.pipe(debounceTime(1000)).subscribe(value => {
              if (value !== '') {
                this.lastChangedControl = { name: controlName, value: value };
                this.evaluateStepCondition(step);
              }
            });
          });
          this.packagingForm.addControl('label', this.formBuilder.control({
            value: '', disabled: false
          }, [Validators.required, Validators.minLength(2)]));
        }))
        .subscribe();
    }


    setInterval(() => {
      this.currentTime = new Date();
    }, 1000);
    // check if ther is a opend package
    // if exsit load it to contunie work on it
    let lineId = this.storageService.getItem("packagingCurrentLine");
    this.packagingBoxService.getOpendPackageByLineId(lineId).pipe(tap((packageBoxs: PackagingBoxDto[]) => {
      this.openedBoxes.next(packageBoxs)

      const currentBox = packageBoxs.find(box => box.status == 1);
      if (currentBox) {
        this.packagingBox.next(currentBox);
        this.snackBar.open("Please complete the following package " + currentBox.barcode, "ok", {
          duration: 50000, verticalPosition: 'bottom', panelClass: ['danger-snackbar']
        })
        // add current to ref localStorage
        this.currentRef.next(currentBox.harness ? currentBox.harness.ref : "")
        // navigate to step
        for (let index = 0; index < this.packagingSteps.getValue().length + 1; index++) {
          this.stepper.next()
        }
      } else {
        const box = packageBoxs[0]
        box.status = 1;
        this.packagingBoxService.updatePackagingBox(box.id, box).subscribe()
        this.packagingBox.next(box);
        this.snackBar.open("Please complete the following package " + box.barcode, "ok", {
          duration: 50000, verticalPosition: 'bottom', panelClass: ['danger-snackbar']
        })
        // add current to ref localStorage
        this.currentRef.next(box.harness ? box.harness.ref : "")
        // navigate to step
        for (let index = 0; index < this.packagingSteps.getValue().length + 1; index++) {
          this.stepper.next()
        }
      }
      // this.packagingBox.next(packageBox)
      // this.snackBar.open("Please complete the following package " + packageBox.barcode, "ok", {
      //   duration: 50000, verticalPosition: 'bottom', panelClass: ['danger-snackbar']
      // })
      // this.currentRef.next(packageBox.harness ? packageBox.harness.ref : "")
      //
      // this.storageService.setItem('current_box_prefix', this.packagingStepsAll.getValue()[0].pre_fix)
      //
      // for (let index = 0; index < this.packagingSteps.getValue().length + 1; index++) {
      //   this.stepper.next()
      // }
      // else return to first step of loop
    })).subscribe({
      next: () => {
        const nextStep = this.stepper.selectedIndex;
        this.focusCtrl(nextStep);
      }
    })

    this.getDataForCharts()
  }

  /**
   *
   */
  getDataForCharts() {
    const filters = {
      from: this.formatDate(this.filterForm.get('from')?.value),
      to: this.formatDate(this.filterForm.get('to')?.value),
      temps_game: this.storageService.getItem('line_disply_rangeTime')
    }
    this.lineDashboardService.getQuantityByHour(filters).subscribe((data: any) => {
      this.countFxPerHour = data
      this.initializeCharts();
    }, (error) => {
      console.error('Error fetching hourly quantity:', error);
    });
  }

  /**
   *
   */
  ngAfterViewInit(): void {
    // setTimeout(() => {
    //   this.initializeCharts()
    // }, 3000)

    setInterval(() => {
      this.getDataForCharts();
    }, 3000)
  }

  /**
   *
   * @param step
   /**
   * Evaluates the condition of a packaging step.
   * @param step - The current packaging step to evaluate.
   */
  async evaluateStepCondition(step: PackagingStep): Promise<void> {
    const formValue = this.packagingForm.getRawValue();
    const conditionMet = await this.checkCondition(step, formValue);
    if (conditionMet) {
      const totalSteps = this.packagingStepsAll.getValue().length;
      const currentQuantity = this.packagingBox.getValue().delivered_quantity;
      const totalQuantity = this.packagingBox.getValue().to_be_delivered_quantity;
      if (step.order === totalSteps) {
        let prodHarness = new CreateProdHarnessDTO(this.currentCounter.getValue(), null, this.packagingBox.getValue().barcode, null, this.packagingBox.getValue().id, 2, this.packagingBox.getValue().harness.id)
        this.prodHarnessService.createProdHarness(prodHarness).pipe(tap(response => {
          if (response && response.response) {
            console.log('ProdHarness created successfully');
            this.packagingBox.getValue().delivered_quantity++
            // Go to last step
            if (this.packagingBox.getValue().delivered_quantity >= this.packagingBox.getValue().to_be_delivered_quantity) {
              this.stepper.next();
              //  this.focusOnLabel()
              //  let lable = new PrintLabelRequest(this.packagingBox.getValue().barcode, this.packagingBox.getValue().barcode)
              //  this.printerService.printLable(lable).subscribe()
              this.focusOnLabel();
              return;
            } else {
              // create a new prod harness
              // else return to first step of loop
              this.activeStep.next(this.loopsSteps.getValue()[0].order)
              this.currentCounter.next("")
              this.focusCtrl(this.loopsSteps.getValue()[0].order);
            }
          } else {
            console.error('Failed to create ProdHarness');
            this.snackBar.open("Failed to create new production harness", "ok", { duration: 3000 })
            this.activeStep.next(this.loopsSteps.getValue()[0].order)
            this.currentCounter.next("")
            this.focusCtrl(this.loopsSteps.getValue()[0].order);
            // Handle failure case, if the response is false but no error was thrown
            // Optionally, you can show a failure message to the user
            // this.notificationService.showError('Failed to create ProdHarness');
          }
        }), catchError(error => {
          console.error('Error occurred while creating ProdHarness:', error);
          this.snackBar.open("Failed to create new production harness", "ok", { duration: 3000 })
          this.activeStep.next(this.loopsSteps.getValue()[0].order)
          this.currentCounter.next("")
          this.focusCtrl(this.loopsSteps.getValue()[0].order);
          // Handle error case, e.g., show an error message to the user
          // this.notificationService.showError('An error occurred while creating ProdHarness');
          return of(null); // Return a fallback value or empty observable to keep the stream alive
        })).subscribe();

      }
      // in loops step
      else if (step.order > this.packagingSteps.getValue().length) {

        this.isPackagingStepTerminate = true;
        // if we past the packaging steps
        if (step.order === this.packagingSteps.getValue().length - 2) {
          if (step.order == totalSteps) {
          }
        } else {
          const nextStep = this.stepper.selectedIndex + 1;
          this.currentStep.next(nextStep);
          this.activeStep.next(nextStep);
          this.focusCtrl(nextStep);
        }
      }
      // go toconfirmation step
      else {
        const nextStep = this.currentStep.getValue() + 1;
        this.currentStep.next(nextStep);
        this.activeStep.next(nextStep);
        this.focusCtrl(nextStep);
      }

      if (step.order === this.packagingSteps.getValue().length) {
        this.createPackage(this.packagingBox.getValue())
      }

    }
    // error case
    else {
      this.snackBar.open('The scanned fields are not correct.', 'Close', {
        duration: 1000, // panelClass: 'danger-snackBar',
        verticalPosition: 'bottom',
        panelClass: ['custom-snackbar', 'display-5'],
        announcementMessage: 'Announcement message for screen readers',
      });
    }
    this.packagingForm.get(step.name)?.setValue('')
  }


  /**
   *
   * @param value
   */
  onFormValueChange(value: any): void {
    const data = value;
    const inputs = Object.keys(data).filter(key => data[key]);
    // console.log(this.lastChangedControl); // Log the last changed control here or perform other actions
  }

  /**
   *
   */
  initializeCharts(): void {
    let postedHours: CountHourLineDto[] = []
    let start = new Date(this.formatDate(this.filterForm.get('from')?.value))
    let to = new Date(this.formatDate(this.filterForm.get('to')?.value))
    let hourCout = 0;
    do {

      let hourInApiHours = this.countFxPerHour.find(hour => hour.hour == start.getHours())
      if (hourInApiHours) {
        postedHours.push(new CountHourLineDto(hourInApiHours.total_quantity, start.getHours()))
      } else {
        console.log("not found");
        postedHours.push(new CountHourLineDto(0, start.getHours()))
      }
      start.setHours(start.getHours() + 1)
      hourCout++;
    } while (hourCout < 8)

    this.countFxPerHour = postedHours
    this.totalOfDeliveredHarnessPerShift = 0
    this.countFxPerHour.map(value => {
      this.totalOfDeliveredHarnessPerShift += parseInt(value.total_quantity.toString())
    })


    // const ctx2 = document.getElementById('myChart2') as HTMLCanvasElement;
    // const labels = ['H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'H7', 'H8'];
    // new Chart(ctx2, {
    //   type: 'line', data: {
    //     labels: labels, datasets: [{
    //       label: 'Harness per hour',
    //       data: this.countFxPerHour.map(value => value.total_quantity),
    //       fill: false,
    //       borderColor: 'rgb(255, 165, 0)', // Orange color
    //       backgroundColor: 'rgb(0,128,255)', // Blue color for points
    //       tension: 0.1,
    //     }]
    //   }, options: {
    //     responsive: true, plugins: {
    //       legend: {
    //         display: false, position: 'top',
    //       }, title: {
    //         display: false, text: 'progress'
    //       }
    //     }
    //   }
    // });
  }

  /**
   *
   * @param event
   */
  @HostListener('window:keydown.enter', ['$event']) nextStepEnter(event: KeyboardEvent): void {
    if (this.activeStep.getValue() === 0) {
      this.activeStep.next(this.stepper.selectedIndex + 1)
      this.currentStep.next(1);
      this.focusCtrl(1)
    }
  }

  /**
   *
   * @param stepNumber
   */
  focusCtrl(stepNumber: number): void {
    setTimeout(() => {
      const CtrlInput = document.getElementById(`step${stepNumber}`) as HTMLInputElement;
      if (CtrlInput) {
        CtrlInput.focus();
      } else {
        // alert('control not fond' + stepNumber)
      }
    }, 100);
  }

  /**
   *
   * @param step
   * @param formValue
   */
  checkCondition(step: PackagingStep, formValue: any): Promise<boolean> {
    return new Promise((resolve, reject) => {
      switch (step.name) {
        case 'packaging#Box barcode':
          if (formValue['packaging#Box barcode'] !== '') {
            let input = formValue['packaging#Box barcode'];
            // if step prefix not null get the same length from input and test the equality
            if (step.pre_fix != "") {
              let preFix = input.substring(0, step.pre_fix.length)
              step.pre_fix.length >= input.length ? resolve(false) : "";
              // if the prefix are equal get the quantity and go to next step else return false
              if (preFix === step.pre_fix) {
                let partNumber = input.substring(preFix.length, input.length)
                this.packagingBoxService.checkIfBoxExsit(partNumber).subscribe({
                  next: (value) => {
                    if (!value.status) {
                      this.packagingBox.getValue().barcode = partNumber
                      resolve(true)
                      this.storageService.setItem('current_box_prefix', preFix);
                    } else {
                      this.snackBar.open('Box already exist ', 'Ok', { duration: 5000 })
                      resolve(false)
                    }
                  }, error: (err) => {
                    this.snackBar.open(err.message)
                    resolve(false)
                    of(null);
                  }
                })

              } else {
                resolve(false)
              }
            } else {

              resolve(true)
              this.packagingBoxService.checkIfBoxExsit(input).subscribe({
                next: (value) => {
                  if (!value.status) {
                    this.packagingBox.getValue().barcode = input
                    this.storageService.setItem('current_box_prefix', '');
                    resolve(true)
                  } else {
                    this.snackBar.open('Box already exist ', 'Ok', { duration: 5000 })
                  }
                }, error: (err) => {
                  this.snackBar.open(err.message)
                  resolve(false)
                  of(null);
                }
              })
            }
          } else {
            resolve(false);
          }
          break;
        case 'packaging#Box harness-reference':
          let input = formValue['packaging#Box harness-reference']
          // if step prefix not null get the same length from input and test the equality
          if (step.pre_fix != "") {
            let preFix = input.substring(0, step.pre_fix.length)
            step.pre_fix.length >= input.length ? resolve(false) : "";
            // if the prefix are equal get the quantity and go to next step else return false
            if (preFix === step.pre_fix) {
              input.substring(preFix.length, input.length)
              let harnessReference = input.substring(preFix.length, input.length)
              // get all harness reference from API and check if the input value are equale one of feteched
              this.harnessService.getAllHarnesses().pipe(map(values => {
                const harness = values.find(is => is.ref === harnessReference);
                // if true set the hraness id in the currnet box and set the current reference
                if (harness) {
                  this.packagingBox.getValue().harness_id = harness.id;
                  this.currentRef.next(harness.ref)
                  resolve(true);
                } else {
                  resolve(false);
                }
              })).subscribe();
            } else {
              resolve(false)
            }
            // If setp dont containe prefix
          } else {
            // get all harness reference from API and check if the input value are equale one of feteched
            this.harnessService.getAllHarnesses().pipe(map(values => {
              const harness = values.find(is => is.ref === input);
              if (harness) {
                this.packagingBox.getValue().harness_id = harness.id;
                this.currentRef.next(harness.ref)
                resolve(true);
              } else {
                resolve(false);
              }
            })).subscribe();
          }
          break;
        case 'packaging#Box quantity':
          if (formValue['packaging#Box quantity'] !== '') {
            let input = formValue['packaging#Box quantity'];
            let preFix: string;
            // if step prefix not null get the same length from input and test the equality
            if (step.pre_fix != "") {
              step.pre_fix.length >= input.length ? resolve(false) : "";
              preFix = step.pre_fix;
              let inputPreFix = input.substring(0, preFix.length);
              // if the prefix are equal get the quantity and go to next step else return false
              if (preFix === inputPreFix) {
                let netValue = input.substring(preFix.length, input.length);
                let netValueNumber = parseFloat(netValue); // Convert substring to a number
                if (!isNaN(netValueNumber)) {
                  this.packagingBox.getValue().to_be_delivered_quantity = netValue;
                  resolve(true)
                } else {
                  resolve(false)
                }
              } else {
                resolve(false)
              }
            }
            // if step dont contain prefix
            else {
              let netValueNumber = parseFloat(input);
              if (!isNaN(netValueNumber)) {
                this.packagingBox.getValue().to_be_delivered_quantity = netValueNumber;
                resolve(true)
              } else {
                resolve(false)
              }
            }
          } else {
            resolve(false);
          }
          break;
        case 'packaging#Box size':
          if (formValue['packaging#Box size']) {
            if (step.pre_fix != "") {
              resolve(true);
            } else {
              resolve(true);
            }
          } else {
            resolve(false);
          }
          break;
        case 'BOL 1#Counter':
          // if (formValue['BOL 1#Counter'] !== '') {
          if (formValue['BOL 1#Counter'] !== '') {
            let input = formValue['BOL 1#Counter'];
            let preFix: string;
            // if step prefix not null get the same length from input and test the equality
            if (step.pre_fix != "") {
              step.pre_fix.length >= input.length ? resolve(false) : "";
              preFix = step.pre_fix;
              let inputPreFix = input.substring(0, preFix.length);
              // if the prefix are equal get the quantity and go to next step else return false
              if (preFix === inputPreFix) {
                input.substring(preFix.length, input.length)
                let counter = input.substring(preFix.length, input.length)
                this.checkIfCounterExist(counter).then(exist => {
                  if (exist) {
                    resolve(false);
                  } else {
                    if (this.currentCounter.getValue() === "") {
                      this.currentCounter.next(counter)
                      resolve(true);
                    } else {
                      this.currentCounter.getValue() === counter ? resolve(true) : resolve(false)
                    }
                  }
                })
              } else {
                resolve(false)
              }
            }
            // if step dont contain prefix
            else {
              let counter = input
              this.checkIfCounterExist(counter).then(exist => {
                if (exist) {
                  resolve(false);
                } else {
                  if (this.currentCounter.getValue() === "") {
                    this.currentCounter.next(counter)
                  } else {
                    this.currentCounter.getValue() === counter ? resolve(true) : resolve(false)
                  }
                }
              })
            }
          } else {
            resolve(false);
          }

          // } else {
          //   resolve(false);
          // }
          break;
        case 'BOL 1#Harness reference':
          if (formValue['BOL 1#Harness reference'] !== '') {
            let input = formValue['BOL 1#Harness reference'];
            // if step prefix not null get the same length from input and test the equality
            if (step.pre_fix != "") {
              let preFix = input.substring(0, step.pre_fix.length)
              step.pre_fix.length >= input.length ? resolve(false) : "";
              // if the prefix are equal get the quantity and go to next step else return false
              if (preFix === step.pre_fix) {
                input.substring(preFix.length, input.length)
                let harnessReference = input.substring(preFix.length, input.length)
                // check equality
                if (harnessReference == this.currentRef.getValue() || harnessReference == this.packagingBox.getValue().harness.ref) {
                  resolve(true)
                } else {
                  resolve(false)
                }
              } else {
                resolve(false)
              }
            } else {
              if (input == this.currentRef.getValue() || input == this.packagingBox.getValue().harness.ref) {
                resolve(true)
              } else {
                resolve(false)
              }
            }
          } else {
            resolve(false);
          }
          break;
        case 'BOL 1#Box size':
          if (formValue['BOL 1#Box size'] !== '') {
            resolve(true);
          } else {
            resolve(false);
          }
          break;
        case 'PTA#Counter':
          if (formValue['PTA#Counter'] !== '') {
            let input = formValue['PTA#Counter'];
            let preFix: string;
            // if step prefix not null get the same length from input and test the equality
            if (step.pre_fix != "") {
              step.pre_fix.length >= input.length ? resolve(false) : "";
              preFix = step.pre_fix;
              let inputPreFix = input.substring(0, preFix.length);
              // if the prefix are equal get the quantity and go to next step else return false
              if (preFix === inputPreFix) {
                input.substring(preFix.length, input.length)
                let counter = input.substring(preFix.length, input.length)
                this.checkIfCounterExist(counter).then(exist => {
                  if (exist) {
                    resolve(false);
                  } else {
                    if (this.currentCounter.getValue() === "") {
                      this.currentCounter.next(counter)
                      resolve(true);
                    } else {
                      this.currentCounter.getValue() === counter ? resolve(true) : resolve(false)
                    }
                  }
                })
              } else {
                resolve(false)
              }
            }
            // if step dont contain prefix
            else {
              let counter = input
              this.checkIfCounterExist(counter).then(exist => {
                if (exist) {
                  resolve(false);
                } else {
                  if (this.currentCounter.getValue() === "") {
                    this.currentCounter.next(counter)
                  } else {
                    this.currentCounter.getValue() === counter ? resolve(true) : resolve(false)
                  }
                }
              })
            }
          } else {
            resolve(false);
          }
          break;
        case 'PTA#Harness reference':
          if (formValue['PTA#Harness reference'] !== '') {
            let input = formValue['PTA#Harness reference'];
            // if step prefix not null get the same length from input and test the equality
            if (step.pre_fix != "") {
              let preFix = input.substring(0, step.pre_fix.length)
              step.pre_fix.length >= input.length ? resolve(false) : "";
              // if the prefix are equal get the quantity and go to next step else return false
              if (preFix === step.pre_fix) {
                input.substring(preFix.length, input.length)
                let harnessReference = input.substring(preFix.length, input.length)
                // check equality
                harnessReference == this.currentRef.getValue() ? resolve(true) : resolve(false);
              } else {
                resolve(false)
              }
            } else {
              input == this.currentRef.getValue() ? resolve(true) : resolve(false);
            }
          } else {
            resolve(false);
          }
          break;
        case 'BOL 2#Counter':
          if (formValue['BOL 2#Counter'] !== '') {
            let input = formValue['BOL 2#Counter'];
            let preFix: string;
            // if step prefix not null get the same length from input and test the equality
            if (step.pre_fix != "") {
              step.pre_fix.length >= input.length ? resolve(false) : "";
              preFix = step.pre_fix;
              let inputPreFix = input.substring(0, preFix.length);
              // if the prefix are equal get the quantity and go to next step else return false
              if (preFix === inputPreFix) {
                input.substring(preFix.length, input.length)
                let counter = input.substring(preFix.length, input.length)
                this.checkIfCounterExist(counter).then(exist => {
                  if (exist) {
                    resolve(false);
                  } else {
                    if (this.currentCounter.getValue() === "") {
                      this.currentCounter.next(counter)
                      resolve(true);
                    } else {
                      this.currentCounter.getValue() === counter ? resolve(true) : resolve(false)
                    }
                  }
                })
              } else {
                resolve(false)
              }
            }
            // if step dont contain prefix
            else {
              let counter = input
              this.checkIfCounterExist(counter).then(exist => {
                if (exist) {
                  resolve(false);
                } else {
                  if (this.currentCounter.getValue() === "") {
                    this.currentCounter.next(counter)
                  } else {
                    this.currentCounter.getValue() === counter ? resolve(true) : resolve(false)
                  }
                }
              })
            }
          } else {
            resolve(false);
          }
          break;
        case 'BOL 2#Harness reference':
          if (formValue['BOL 2#Harness reference'] !== '') {
            let input = formValue['BOL 2#Harness reference'];
            // if step prefix not null get the same length from input and test the equality
            if (step.pre_fix != "") {
              let preFix = input.substring(0, step.pre_fix.length)
              step.pre_fix.length >= input.length ? resolve(false) : "";
              // if the prefix are equal get the quantity and go to next step else return false
              if (preFix === step.pre_fix) {
                input.substring(preFix.length, input.length)
                let harnessReference = input.substring(preFix.length, input.length)
                if (harnessReference == this.currentRef.getValue() || harnessReference == this.packagingBox.getValue().harness.ref) {
                  resolve(true)
                } else {
                  resolve(false)
                }
              } else {
                resolve(false)
              }
            } else {
              if (input == this.currentRef.getValue() || input == this.packagingBox.getValue().harness.ref) {
                resolve(true)
              } else {
                resolve(false)
              }
              input == this.currentRef.getValue() ? resolve(true) : resolve(false);
            }
          } else {
            resolve(false);
          }
          break;
        default:
          resolve(false);
      }
    });
  }

  /**
   * this function provide us to create package in back-end
   * @param packagingBoxDto
   */
  createPackage(packagingBoxDto: PackagingBoxDto): void {
    this.packagingBoxService.createPackagingBox(packagingBoxDto).pipe(tap(packagingBox => {
      this.packagingBox.next(packagingBox)
      // this.packagingBox.getValue().id = packagingBox.id
    })).subscribe()
  }


  setDefaultDates() {
    const currentDate = new Date();
    const currentHour = currentDate.getHours();

    let fromDate: Date;
    let toDate: Date;

    if (currentHour >= 22 || currentHour < 6) {
      // Shift C
      fromDate = new Date(currentDate);
      fromDate.setHours(22, 0, 0, 0);
      toDate = new Date(currentDate);
      if (currentHour < 6) {
        fromDate.setDate(fromDate.getDate() - 1); // Previous day 22:00
      } else {
        toDate.setDate(toDate.getDate() + 1); // Next day 06:00
      }
      toDate.setHours(6, 0, 0, 0);
    } else if (currentHour >= 6 && currentHour < 14) {
      // Shift A
      fromDate = new Date(currentDate);
      fromDate.setHours(6, 0, 0, 0);
      toDate = new Date(currentDate);
      toDate.setHours(14, 0, 0, 0);
    } else {
      // Shift B
      fromDate = new Date(currentDate);
      fromDate.setHours(14, 0, 0, 0);
      toDate = new Date(currentDate);
      toDate.setHours(22, 0, 0, 0);
    }

    this.filterForm.patchValue({
      from: this.formatDate(fromDate), to: this.formatDate(toDate), // shift: this.getCurrentShift(currentHour)
    });
  }

  /**
   *
   * @param date
   * @returns
   */
  formatDate(date: any): string {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = ('0' + (d.getMonth() + 1)).slice(-2);
    const day = ('0' + d.getDate()).slice(-2);
    const hours = ('0' + d.getHours()).slice(-2);
    const minutes = ('0' + d.getMinutes()).slice(-2);
    const seconds = ('0' + d.getSeconds()).slice(-2);

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  }


  /**
   *
   */
  openDialog(): void {
    this.dialog.open(LineDisplayDialogComponent, {
      width: '50%', data: { /* pass any data here if needed */ }
    });
  }


  focusOnLabel() {
    setTimeout(() => {
      const CtrlInput = document.getElementById(`label`) as HTMLInputElement;
      if (CtrlInput) {
        CtrlInput.focus();
      } else {
        // alert('control not fond' + stepNumber)
      }
    }, 100);
  }

  /**
   *
   * @param counter
   * @returns
   */
  async checkIfCounterExist(counter: string): Promise<boolean> {
    try {
      const responseData = await firstValueFrom(this.prodHarnessService.getByRef(counter));
      // If the API call was successful, you can process the data.
      this.currentUuid.next(counter);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   *
   * @param id
   */
  changeSelectedBox(id: number) {
    this.packagingBoxService.setPackagingBoxSelected(id).pipe(
      tap((value) => {
        if (value.success) {
          window.location.reload()
        }
      }),
      catchError((err) => {
        this.snackBar.open(`Error during select package as default: ${err.message}`)
        return of(null);
      })
    ).subscribe()
  }

  /**
   *
   */
  openNewPackage() {
    this.stepper.reset()
    this.activeStep.next(0)
    this.currentStep.next(0);
  }
}


