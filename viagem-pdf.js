// ======================
// Gera um PDF com desenho próprio (jsPDF) dos dias da viagem, na mesma
// paleta bege/azul/amarelo do resto da página — em vez de depender do
// "Imprimir" do browser, que fica genérico e cheio de cabeçalhos/rodapés
// que não conseguimos controlar.
// ======================
(function () {
    const PAGE_W = 210;
    const PAGE_H = 297;
    const MARGIN = 16;
    const CONTENT_W = PAGE_W - MARGIN * 2;
    const FOOTER_Y = PAGE_H - 10;

    const BEIGE = [244, 234, 214];
    const BLUE = [35, 93, 130];
    const BLUE_DEEP = [22, 62, 88];
    const BLUE_SOFT = [228, 238, 243];
    const YELLOW = [238, 181, 47];
    const TEXT = [47, 59, 69];
    const MUTED = [138, 125, 95];

    function activityText(item) {
        return typeof item === 'string' ? item : (item.nome || '');
    }
    function activityLink(item) {
        return typeof item === 'string' ? null : (item.mapsUrl || null);
    }

    function paintPageBackground(doc) {
        doc.setFillColor(...BEIGE);
        doc.rect(0, 0, PAGE_W, PAGE_H, 'F');
    }

    function drawContinuationBar(doc) {
        doc.setFillColor(...YELLOW);
        doc.rect(0, 0, PAGE_W, 3, 'F');
        doc.setFont('times', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(...BLUE_DEEP);
        doc.text('Viagem Lisboa', MARGIN, 14);
    }

    function buildPdf() {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ unit: 'mm', format: 'a4' });

        let y = MARGIN;

        // --- Capa / cabeçalho da primeira página ---
        paintPageBackground(doc);
        doc.setFillColor(...BLUE_DEEP);
        doc.rect(0, 0, PAGE_W, 38, 'F');
        doc.setFillColor(...YELLOW);
        doc.rect(0, 38, PAGE_W, 2, 'F');
        doc.setFont('times', 'bold');
        doc.setFontSize(26);
        doc.setTextColor(255, 255, 255);
        doc.text('Viagem Lisboa', MARGIN, 23);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(11);
        doc.setTextColor(...YELLOW);
        doc.text('Itinerário dos dias', MARGIN, 31);

        y = 50;

        function ensureSpace(needed) {
            if (y + needed > FOOTER_Y - 4) {
                doc.addPage();
                paintPageBackground(doc);
                drawContinuationBar(doc);
                y = 24;
            }
        }

        function drawPill(text, x, yTop) {
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(8.5);
            const w = doc.getTextWidth(text) + 6;
            doc.setFillColor(...YELLOW);
            doc.roundedRect(x, yTop - 3.6, w, 5.2, 2.6, 2.6, 'F');
            doc.setTextColor(...BLUE_DEEP);
            doc.text(text, x + 3, yTop);
            return w;
        }

        const days = (window.TRIP_DAYS || []);
        days.forEach((dia) => {
            ensureSpace(16);

            // Título do dia
            doc.setFillColor(...YELLOW);
            doc.rect(MARGIN, y, 2.4, 8, 'F');
            doc.setFillColor(...BLUE_SOFT);
            doc.roundedRect(MARGIN + 4, y - 1, CONTENT_W - 4, 10, 2, 2, 'F');
            doc.setFont('times', 'bold');
            doc.setFontSize(13.5);
            doc.setTextColor(...BLUE_DEEP);
            doc.text(dia.titulo, MARGIN + 8, y + 6.2);
            y += 15;

            dia.periodos.forEach((p) => {
                ensureSpace(12);

                doc.setFont('helvetica', 'bold');
                doc.setFontSize(11);
                doc.setTextColor(...BLUE_DEEP);
                doc.text(p.titulo, MARGIN + 2, y);

                if (p.hora) {
                    const titleW = doc.getTextWidth(p.titulo);
                    drawPill(p.hora, MARGIN + 2 + titleW + 4, y);
                }
                y += 6;

                p.atividades.forEach((item) => {
                    const text = activityText(item);
                    const link = activityLink(item);
                    doc.setFont('helvetica', 'normal');
                    doc.setFontSize(9.5);
                    doc.setTextColor(...TEXT);
                    const lines = doc.splitTextToSize(text, CONTENT_W - 12);
                    ensureSpace(lines.length * 4.4 + 1);
                    doc.setTextColor(...BLUE);
                    doc.text('•', MARGIN + 4, y);
                    if (link) {
                        doc.setTextColor(...BLUE);
                        doc.textWithLink(lines[0], MARGIN + 9, y, { url: link });
                    } else {
                        doc.setTextColor(...TEXT);
                        doc.text(lines[0], MARGIN + 9, y);
                    }
                    for (let i = 1; i < lines.length; i++) {
                        y += 4.4;
                        doc.setTextColor(...TEXT);
                        doc.text(lines[i], MARGIN + 9, y);
                    }
                    y += 4.4;
                });

                if (p.notas) {
                    ensureSpace(5);
                    doc.setFont('helvetica', 'italic');
                    doc.setFontSize(9);
                    doc.setTextColor(...MUTED);
                    doc.text(p.notas, MARGIN + 4, y);
                    y += 5;
                }
                if (p.custoEstimado) {
                    ensureSpace(5);
                    doc.setFont('helvetica', 'italic');
                    doc.setFontSize(9);
                    doc.setTextColor(...MUTED);
                    doc.text('Custo estimado: ' + p.custoEstimado, MARGIN + 4, y);
                    y += 5;
                }
                y += 2;
            });

            if (dia.custoEstimado) {
                ensureSpace(6);
                doc.setFont('helvetica', 'bolditalic');
                doc.setFontSize(9.5);
                doc.setTextColor(...BLUE_DEEP);
                doc.text('Custo estimado do dia: ' + dia.custoEstimado, MARGIN + 2, y);
                y += 6;
            }

            y += 6;
        });

        // --- Rodapé com número de página em todas as páginas ---
        const totalPages = doc.internal.getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) {
            doc.setPage(i);
            doc.setDrawColor(...YELLOW);
            doc.setLineWidth(0.4);
            doc.line(MARGIN, FOOTER_Y - 4, PAGE_W - MARGIN, FOOTER_Y - 4);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            doc.setTextColor(...MUTED);
            doc.text('Amo-te, Maria · Viagem Lisboa', MARGIN, FOOTER_Y);
            doc.text(`Página ${i} de ${totalPages}`, PAGE_W - MARGIN, FOOTER_Y, { align: 'right' });
        }

        doc.save('viagem-lisboa-itinerario.pdf');
    }

    document.addEventListener('DOMContentLoaded', () => {
        const btn = document.getElementById('trip-days-pdf-btn');
        if (!btn) return;
        btn.addEventListener('click', () => {
            if (!window.jspdf) {
                alert('Não consegui carregar o gerador de PDF. Verifica a ligação à internet e tenta de novo.');
                return;
            }
            buildPdf();
        });
    });
})();
