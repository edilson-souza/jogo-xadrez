class PawnPromotion {
    constructor(game, callback) {
        this.game = game;
        this.callback = callback;
        this.selectedPiece = null;
        this.createStyle();
        this.createModal();
    }

    createStyle() {
        if (document.getElementById('promoStyle')) return;
        const style = document.createElement('style');
        style.id = 'promoStyle';
        style.innerHTML = `
            #promoModal { display: none; position: fixed; z-index: 1000; left: 0; top: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.6); }
            #promoContent { background-color: #2a2a2a; color: white; margin: 15% auto; padding: 20px; border-radius: 12px; width: 300px; text-align: center; border: 1px solid #444; }
            .promo-options { display: flex; justify-content: space-around; margin-top: 20px; }
            .promo-option { width: 60px; height: 60px; cursor: pointer; transition: all 0.2s; }
            .promo-option:hover { transform: scale(1.1); border-bottom: 2px solid #27ae60; }
            .highlight-selected { box-shadow: inset 0 0 3px 3px #27ae60 !important; background-color: rgba(39, 174, 96, 0.3) !important; }
        `;
        document.head.appendChild(style);
    }

    createModal() {
        this.modal = document.createElement('div');
        this.modal.id = 'promoModal';
        this.modal.innerHTML = `
            <div id="promoContent">
                <h3>Promoção de Peão</h3>
                <div class="promo-options">
                    <img class="promo-option" data-piece="q">
                    <img class="promo-option" data-piece="r">
                    <img class="promo-option" data-piece="b">
                    <img class="promo-option" data-piece="n">
                </div>
            </div>
        `;
        document.body.appendChild(this.modal);
        this.modal.querySelectorAll('.promo-option').forEach(opt => {
            opt.addEventListener('click', (e) => {
                this.selectedPiece = e.target.dataset.piece;
                this.close();
                this.callback(this.selectedPiece);
            });
        });
    }

    open() {
        const turn = this.game.logic.turn(); 
        this.modal.querySelectorAll('.promo-option').forEach(img => {
            const p = img.dataset.piece;
            img.src = `https://chessboardjs.com/img/chesspieces/wikipedia/${turn}${p.toUpperCase()}.png`;
        });
        this.modal.style.display = 'block';
    }

    close() { this.modal.style.display = 'none'; }
}