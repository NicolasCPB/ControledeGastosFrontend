const baseUrl = "http://localhost:8080"

const Modal = {
    open() {
        document
            .querySelector(".modal-overlay")
            .classList
            .add("active")
    },
    close() {
        document
            .querySelector(".modal-overlay")
            .classList
            .remove("active")
    },

}

const CardColor = {
    positive() {
        document
            .querySelector(".card.total")
            .classList
            .remove("negative")
        document
            .querySelector(".card.total")
            .classList
            .add("positive")
    },
    negative() {
        document
            .querySelector(".card.total")
            .classList
            .remove("positive")
        document
            .querySelector(".card.total")
            .classList
            .add("negative")
    }
}

const Storage = {
    get() {
        return JSON.parse(localStorage.getItem("dev.finances:transactions")) || []
    },

    set(transactions) {
        localStorage.setItem("dev.finances:transactions", JSON.stringify(transactions))
    },

    setTransactions(transactions) {
        localStorage.setItem('allTransactions', JSON.stringify(transactions));
    }
}

const Transaction = {
    all: Storage.get(),
    add(transaction) {
        Transaction.all.push(transaction);
        var json = JSON.stringify(transaction)
        const requestOptions = {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: json
        };
          
        fetch(baseUrl + "/salvarTransacao", requestOptions)
            .then(response => response.json())
            .then(data => {
                if (data.mensagem.includes("excedido")) {
                    Utils.showCustomAlert(data.mensagem, 'warning')
                }
                Storage.set(Transaction.all);
                DOM.addTransaction(transaction, Transaction.all.length - 1);
                App.reload()
        })
        .catch(error => {
            console.error('Erro na requisição:', error);
        });
    },
    remove(identificador, index) {
        try {
            fetch(baseUrl + "/excluirTransacao" + "/" + identificador, {
                method: 'DELETE'
            })
            .then(res => {
                Transaction.all.splice(index, 1)
                App.reload()
            })
        } catch (error) {
            console.error('Erro na requisição:', error);
        }
        

        App.reload()
    },
    edit(transaction) {
        try {
            fetch(baseUrl + "/editarTransacao" + "/" + ModalEdit.identificador, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(transaction)
            })
            .then(res => {
                App.reload()
            })
        } catch (error) {
            console.error('Erro na requisição:', error);
        }
    },
    incomes() { // Somar tipoTransacaos
        let income = 0

        Transaction.all.forEach(transaction => {
            if (transaction.valor > 0) {
                income += transaction.valor
            }
        })
        return income
    },
    expenses() { // Somar saídas
        let expense = 0

        Transaction.all.forEach(transaction => {
            if (transaction.valor < 0) {
                expense += transaction.valor
            }
        })
        return expense
    },
    total() { // tipoTransacaos menos saídas
        return Transaction.incomes() + Transaction.expenses()
    }
}

const Categoria = {
    async loadCategorias() {
        try {
            const response = await fetch(baseUrl + "/listarCategorias");
            const data = await response.json();

            var selectSidebar = document.querySelector("#categoriaSidebar");
            var selectModal = document.querySelector("#categoriaModal");
            var selectModalEdit = document.querySelector("#categoriaModalEdit");

            this.clearCategorias(selectSidebar)
            this.clearCategorias(selectModal)
            this.clearCategorias(selectModalEdit)

            var option = document.createElement("option");
            option.text = "Selecione";
            option.value = "";
            selectSidebar.appendChild(option)
            data.data.forEach(function(categoria) {
                const optionSidebar = document.createElement("option");
                const optionModal = document.createElement("option");
                const optionModalEdit = document.createElement("option");

                optionSidebar.value = categoria.nome;
                optionModal.value = categoria.nome;
                optionModalEdit.value = categoria.nome;
                
                optionSidebar.text = categoria.nome;
                optionModal.text = categoria.nome;
                optionModalEdit.text = categoria.nome;

                selectSidebar.appendChild(optionSidebar);
                selectModal.appendChild(optionModal);
                selectModalEdit.appendChild(optionModalEdit);
            });
        } catch (error) {
            console.error('Erro na requisição:', error);
        }
    },

    clearCategorias(elemento) {
        while (elemento.options.length > 0) {
            elemento.remove(0);
        }
    }
}

const DOM = {
    transactionsContainer: document.querySelector("#data-table tbody"),
    addTransaction(transactions, index) {
        const tr = document.createElement("tr")
        tr.innerHTML = DOM.innerHTMLTransaction(transactions, index)

        DOM.transactionsContainer.appendChild(tr)
    },

    innerHTMLTransaction(transactions) {
        var valor
        if (transactions.tipoTransacao == 'Saida') {
            transactions.valor = transactions.valor * -1
        }
        const CSSclass = transactions.valor > 0 ? "income":"expense"
        if (CSSclass == "income") {
            valor = Utils.formatCurrency(transactions.valor, "entrada")
        } else {
            valor = Utils.formatCurrency(transactions.valor, "saida")
        }
        
        const dia = transactions.data.substring(8, 10);
        const mes = transactions.data.substring(5, 7);
        const ano = transactions.data.substring(0, 4);

        const dataFormatada = `${dia}/${mes}/${ano}`;
        transacaoJson = JSON.stringify(transactions)
        const html = `
        <td class="categoria">${transactions.categoria}</td>
        <td class="descricao">${transactions.descricao}</td>
        <td class="${CSSclass}">${valor}</td>
        <td class="data">${dataFormatada}</td>
        <td class="acoes">
            <img onclick="Transaction.remove(${transactions.identificador}, ${transactions.index})" src="./assets/minus.svg" class="remove" alt="Remover Transação">
            <img onclick="ModalEdit.open(${transactions.identificador}, ${JSON.stringify(transactions).replace(/"/g, '&quot;')})" src="./assets/edit.svg" class="edit" alt="Editar Transação">
        </td>
        `
        return html
    },

    updateBalance() {   
        var totEntrada = 0;
        var totSaida = 0;
        var transactions = JSON.parse(localStorage.getItem('allTransactions'));
        for (var i = 0; i < transactions.length; i++) {
            if (transactions[i].tipoTransacao == 'Entrada') {
                totEntrada += transactions[i].valor
            }
            if (transactions[i].tipoTransacao == 'Saida') {
                totSaida += transactions[i].valor
            }
        }
        const tot = totEntrada - totSaida;
        if (tot < 0) {
            CardColor.negative()
            document.querySelector("#totalDisplay").innerHTML = Utils.formatCurrency(tot, "saida");
        } else {
            CardColor.positive()
            document.querySelector("#totalDisplay").innerHTML = Utils.formatCurrency(tot, "entrada");
        }
        document.querySelector("#incomeDisplay").innerHTML = Utils.formatCurrency(totEntrada, "entrada");
        document.querySelector("#expenseDisplay").innerHTML = Utils.formatCurrency(totSaida, "saida");
        document.querySelector("#totalDisplay").innerHTML = Utils.formatCurrency(tot);
    },

    clearTransactions(){
        localStorage.setItem('allTransactions', null);
        DOM.transactionsContainer.innerHTML = ""
    }
}

const Utils = {
    formatCurrency(value, tipoTransacao) {
        var signal
        if (tipoTransacao == "entrada") {
            signal = "+&nbsp;"
        } else {
            signal = ""
        }
        value = Number(value)
        value = value.toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL",
        })

        return signal + value
    },
    formatvalor(value) {
        value = value * 100
        return Math.round(value)
    },
    formatSimple(value){
        const signal = Number(value) < 0 ? "- " : "+ "
        value = String(value).replace(/\D/g, "")
        value = Number(value)
        value = value.toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL",
        })

        return signal + value
    },
    showCustomAlert(mensagem, iconType) {
        Swal.fire({
          title: mensagem,
          icon: iconType,
          confirmButtonColor: '#3085d6',
          confirmButtonText: 'Ok'
        });
    }
}

const Form = {
    categoria: document.querySelector("select#categoriaModal"),
    descricao: document.querySelector("input#descricaoModal"),
    valor: document.querySelector("input#valorModal"),
    tipoTransacao: document.querySelector("input#tipoTransacaoModal"),
    data: document.querySelector("input#dataModal"),
    
    getValues() {
        return {
            categoria: Form.categoria.value,
            descricao: Form.descricao.value,
            valor: Form.valor.value,
            tipoTransacao: Form.tipoTransacao.checked,
            data: Form.data.value,
        };
    },

    validateFields() {
        const { categoria, valor, data } = Form.getValues();
        if (valor.trim() === "" || data.trim() === "" || categoria.trim() === "") {
            throw new Error("Por favor, preencha todos os campos!");
        }
    },

    formatValues() {
        let { categoria, descricao, valor, tipoTransacao, data} = Form.getValues();

        if (tipoTransacao){
            tipoTransacao = 'Entrada'
        } else {
            tipoTransacao = 'Saida'
        }

        return {
            categoria,
            descricao,
            valor,
            tipoTransacao,
            data,
        };
    },

    saveTransaction(transaction) {
        Transaction.add(transaction)
    },

    clearFields() {
        Form.categoria.value = null;
        Form.descricao.value = "";
        Form.valor.value = "";
        Form.tipoTransacao.checked = false;
        Form.data.value = "";
    },

    submit(event) {
        event.preventDefault();
        try {
            Form.validateFields(); 
            const transaction = Form.formatValues(); 
            Form.saveTransaction(transaction); 
            Form.clearFields(); 

            Modal.close(); 
        } catch (error) {
            console.warn(error.message);
            toastError(error.message);
        }
    },
};

const Filtro = {
    categoria: document.querySelector("select#categoriaSidebar"),
    descricao: document.querySelector("input#descricaoSidebar"),
    valor: document.querySelector("input#valorSidebar"),
    tipoTransacao: document.querySelector("select#tipoTransacaoSidebar"),
    dataInicial: document.querySelector("input#dataInicialSidebar"),
    dataFinal: document.querySelector("input#dataFinalSidebar"),
    
    getValues() {
        return {
            categoria: Filtro.categoria.value,
            descricao: Filtro.descricao.value,
            valor: Filtro.valor.value,
            tipoTransacao: Filtro.tipoTransacao.value,
            dataInicial: Filtro.dataInicial.value,
            dataFinal: Filtro.dataFinal.value,
        };
    },

    formatValues() {
        let { categoria, descricao, valor, tipoTransacao, dataInicial, dataFinal} = Filtro.getValues();

        return {
            categoria,
            descricao,
            valor,
            tipoTransacao,
            dataInicial,
            dataFinal,
        };
    },

    async filtrar(filtro) {
        const endpoint = baseUrl + "/listarTransacoesPorFiltro";
        const queryParams = new URLSearchParams(filtro);
        try {
            const response = await fetch(`${endpoint}?${queryParams}`);   
            const data = await response.json();
            DOM.clearTransactions();
            
            Storage.setTransactions(data.data)
            DOM.updateBalance()
            data.data.forEach((transaction, index) => {
                DOM.addTransaction(transaction, index);
            });
        } catch (error) {
            console.error("Erro na requisição:", error);
        }
    },

    submit(event) {
        event.preventDefault()
        try {
            const filtro = Filtro.formatValues();
            Filtro.filtrar(filtro); 
        } catch (error) {
            console.warn(error.message);
            toastError(error.message);
        }
    },

}

const Sidebar = {
    w3_open() {
        var main = document.querySelector("#main");
        var sidebar = document.querySelector("#mySidebar");
        var nav = document.querySelector("#openNav");
        main.style.marginLeft = "25%";
        sidebar.style.width = "25%";
        sidebar.style.display = "block";
        nav.style.display = 'none';
    },

    w3_close() {
        document.querySelector("#main").style.marginLeft = "0%";
        document.querySelector("#mySidebar").style.display = "none";
        document.querySelector("#openNav").style.display = "inline-block";
    }
}

const App = {
    categorias: [],

    async init() {
        await App.fetchTransactions();
        await Categoria.loadCategorias()
        DOM.updateBalance();
    },

    async fetchTransactions() {
        try {
            const response = await fetch(baseUrl + "/listarTransacoesPorFiltro");
            const data = await response.json();
            DOM.clearTransactions();

            Storage.setTransactions(data.data)
            DOM.updateBalance()
            data.data.forEach((transaction, index) => {
                DOM.addTransaction(transaction, index);
            });
        } catch (error) {
            console.error("Erro ao buscar as transações:", error);
        }
    },

    reload() {
        DOM.clearTransactions();
        App.init();
    }
};

const Exportacao = {
    exportarParaPDF() {
        const tableData = [];
        const table = document.getElementById("data-table");
        gastoComida = 0
        gastoLanche = 0
        gastoFesta = 0
        gastoUber = 0
        gastoLazer = 0
        gastoRoupa = 0
        gastoCartao = 0
        gastoOutros = 0
        console.log(table)
        for (let i = 0; i < table.rows.length; i++) {
          const row = [];
          for (let j = 0; j < table.rows[i].cells.length; j++) {
            categoryPdf = table.rows[i].cells[j].textContent
            switch(table.rows[i].cells[j].textContent) {
                case "Comida":
                    gastoComida = gastoComida + parseFloat(table.rows[i].cells[2].textContent.substring(3).replace(/\./g, '').replace(',', '.'))
                    break
                case "Lanche":
                    gastoLanche = gastoLanche + parseFloat(table.rows[i].cells[2].textContent.substring(3).replace(/\./g, '').replace(',', '.'))
                    break
                case "Festa":
                    gastoFesta = gastoFesta + parseFloat(table.rows[i].cells[2].textContent.substring(3).replace(/\./g, '').replace(',', '.'))
                    break
                case "Uber":
                    gastoUber = gastoUber + parseFloat(table.rows[i].cells[2].textContent.substring(3).replace(/\./g, '').replace(',', '.'))
                    break
                case "Lazer":
                    gastoLazer = gastoLazer + parseFloat(table.rows[i].cells[2].textContent.substring(3).replace(/\./g, '').replace(',', '.'))
                    break
                case "Roupa":
                    gastoRoupa = gastoRoupa + parseFloat(table.rows[i].cells[2].textContent.substring(3).replace(/\./g, '').replace(',', '.'))
                    break
                case "Cartão de crédito":
                    console.log(table.rows[i].cells[2].textContent.substring(3).replace(/\./g, '').replace(',', '.'))
                    console.log(parseFloat(table.rows[i].cells[2].textContent.substring(3).replace(/\./g, '').replace(',', '.')))
                    gastoCartao = gastoCartao + parseFloat(table.rows[i].cells[2].textContent.substring(3).replace(/\./g, '').replace(',', '.'))
                    break
                case "Outros":
                    gastoOutros = gastoOutros + parseFloat(table.rows[i].cells[2].textContent.substring(3).replace(/\./g, '').replace(',', '.'))
                    break
            }
            row.push(table.rows[i].cells[j].textContent);
          }
          tableData.push(row);
        }
        gastoTotal = gastoComida + gastoLanche + gastoFesta + gastoUber + gastoLazer + gastoRoupa + gastoCartao + gastoOutros
        console.log(gastoComida)
        const docDefinition = {
          content: [
            { text: "Gastos do mês", style: "header" },
            { text: `Total: ${gastoTotal.toFixed(2)}`, style: "categoria"},
            { text: `Comida: ${gastoComida.toFixed(2)}`, style: "categoria"},
            { text: `Lanche: ${gastoLanche.toFixed(2)}`, style: "categoria"},
            { text: `Festa: ${gastoFesta.toFixed(2)}`, style: "categoria"},
            { text: `Uber: ${gastoUber.toFixed(2)}`, style: "categoria"},
            { text: `Lazer: ${gastoLazer.toFixed(2)}`, style: "categoria"},
            { text: `Roupa: ${gastoRoupa.toFixed(2)}`, style: "categoria"},
            { text: `Cartão de crédito: ${gastoCartao.toFixed(2)}`, style: "categoria"},
            { text: `Outros: ${gastoOutros.toFixed(2)}`, style: "categoria"},
            { table: { body: tableData } }
          ],
          styles: {
            header: { fontSize: 18, bold: true },
            categoria: { fontSize: 12 }
          }
        };
      
        pdfMake.createPdf(docDefinition).download("gastos.pdf");
    }
}

const ModalEdit = {
    transactionData: {},
    identificador: 0,
    open(identificadorR, transactionString) {
        this.transactionData = transactionString
        this.identificador = identificadorR

        document.querySelector("#categoriaModalEdit").value = this.transactionData.categoria;
        document.querySelector("#descricaoModalEdit").value = this.transactionData.descricao;
        document.querySelector("#valorModalEdit").value = this.transactionData.valor.toString().replace("-", "");
        document.querySelector("#tipoTransacaoModalEdit").checked = this.transactionData.tipo === "entrada";
        document.querySelector("#dataModalEdit").value = this.transactionData.data;

        document
            .querySelector("#modal-edit")
            .classList
            .add("active")
    },
    close() {
        document
            .querySelector("#modal-edit")
            .classList
            .remove("active")
    },
}

const FormEdit = {
    categoria: document.querySelector("select#categoriaModalEdit"),
    descricao: document.querySelector("input#descricaoModalEdit"),
    valor: document.querySelector("input#valorModalEdit"),
    tipoTransacao: document.querySelector("input#tipoTransacaoModalEdit"),
    data: document.querySelector("input#dataModalEdit"),
    
    getValues() {
        return {
            categoria: FormEdit.categoria.value,
            descricao: FormEdit.descricao.value,
            valor: FormEdit.valor.value,
            tipoTransacao: FormEdit.tipoTransacao.checked,
            data: FormEdit.data.value,
        };
    },

    validateFields() {
        const { categoria, valor, data } = FormEdit.getValues();
        if (valor.trim() === "" || data.trim() === "" || categoria.trim() === "") {
            throw new Error("Por favor, preencha todos os campos!");
        }
    },

    formatValues() {
        let { categoria, descricao, valor, tipoTransacao, data} = FormEdit.getValues();

        if (tipoTransacao){
            tipoTransacao = 'Entrada'
        } else {
            tipoTransacao = 'Saida'
        }

        return {
            categoria,
            descricao,
            valor,
            tipoTransacao,
            data,
        };
    },

    editTransaction(transaction) {
        Transaction.edit(transaction)
    },

    submit(event) {
        event.preventDefault();
        try {
            FormEdit.validateFields(); 
            const transaction = FormEdit.formatValues(); 
            FormEdit.editTransaction(transaction);

            ModalEdit.close(); 
        } catch (error) {
            console.warn(error.message);
            toastError(error.message);
        }
    },
}

App.init()

function toastError(message = "ERRO!") {
    const toastId = document.querySelector("#toast")
    toastId.className = "show"

    setTimeout(() => {
        toastId.className = toastId.className.replace("show", "")
    }, 5000)
}