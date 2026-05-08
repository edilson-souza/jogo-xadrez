class ChessNetwork {
    constructor(game) {
        this.game = game;
        // Substitua pelas suas credenciais do Pusher
        this.pusher = new Pusher('8c34ff47496131589002', {
            cluster: 'sa1',
            forceTLS: true
        });

        // Gerenciamento de Sala
        const urlParams = new URLSearchParams(window.location.search);
        this.roomID = urlParams.get('room') || Math.random().toString(36).substring(7);
        
        // Atualiza a URL para permitir compartilhamento
        if (!urlParams.get('room')) {
            window.history.pushState({}, '', `?room=${this.roomID}`);
        }

        this.channel = this.pusher.subscribe(`room-${this.roomID}`);
        this.setupListeners();
        
        this.displayRoomInfo();
    }

    setupListeners() {
        // Ouve movimentos do oponente (Client Events exigem prefixo 'client-')
        this.channel.bind('client-opponent-move', (data) => {
            if (data.color !== this.game.playerColor) {
                this.game.executeMove(data.from, data.to, data.promotion, false);
            }
        });
    }

    sendMove(moveData) {
        // Envia o movimento para o canal
        this.channel.trigger('client-opponent-move', moveData);
    }

    displayRoomInfo() {
        const roomEl = document.getElementById('roomInfo');
        if (roomEl) {
            roomEl.innerHTML = `
                <p>Sala: <strong>${this.roomID}</strong></p>
                <small>Envie o link da página para seu oponente.</small>
            `;
        }
    }
}