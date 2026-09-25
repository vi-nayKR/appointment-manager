import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  ViewChild,
} from '@angular/core';

export type FeedbackMode = 'confirm' | 'success';

@Component({
  selector: 'app-feedback-modal',
  templateUrl: './feedback-modal.html',
  styleUrl: './feedback-modal.css',
})
export class FeedbackModal implements AfterViewInit, OnChanges {
  @Input() open = false;
  @Input() mode: FeedbackMode = 'success';
  @Input() title = '';
  @Input() message = '';
  @Input() confirmLabel = 'Done';
  @Output() readonly confirmed = new EventEmitter<void>();
  @Output() readonly dismissed = new EventEmitter<void>();

  @ViewChild('dialog') private dialog?: ElementRef<HTMLDialogElement>;

  ngAfterViewInit() {
    this.syncOpenState();
  }

  ngOnChanges(_changes: SimpleChanges) {
    this.syncOpenState();
  }

  dismiss(event?: Event) {
    event?.preventDefault();
    this.dismissed.emit();
  }

  backdropClick(event: MouseEvent) {
    if (event.target === this.dialog?.nativeElement) this.dismiss();
  }

  private syncOpenState() {
    const dialog = this.dialog?.nativeElement;
    if (!dialog || dialog.open === this.open) return;
    if (this.open) {
      if (typeof dialog.showModal === 'function') dialog.showModal();
      else dialog.setAttribute('open', '');
    } else {
      if (typeof dialog.close === 'function') dialog.close();
      else dialog.removeAttribute('open');
    }
  }
}
