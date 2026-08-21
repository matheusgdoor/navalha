import {
  ArrowRight,
  CalendarCheck,
  ChartNoAxesCombined,
  Check,
  Clock3,
  MapPin,
  MessageCircle,
  Scissors,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
const plans = [
  {
    name: "Essencial",
    price: "79",
    description: "Para começar a organizar a agenda.",
    items: ["Até 3 barbeiros", "300 agendamentos/mês", "Agenda pública"],
  },
  {
    name: "Profissional",
    price: "149",
    featured: true,
    description: "Para barbearias em crescimento.",
    items: [
      "Até 10 barbeiros",
      "2.000 agendamentos/mês",
      "WhatsApp e relatórios",
    ],
  },
  {
    name: "Escala",
    price: "299",
    description: "Para redes e operações maiores.",
    items: ["Até 50 barbeiros", "10.000 agendamentos/mês", "Gestão avançada"],
  },
];
export default function Landing() {
  return (
    <main className="landing">
      <header className="landingNav">
        <a href="/" className="landingBrand">
          <span>
            <Scissors />
          </span>
          <div>
            NAVALHA<small>GESTÃO PARA BARBEARIAS</small>
          </div>
        </a>
        <nav>
          <a href="#recursos">Recursos</a>
          <a href="#agendamento">Para clientes</a>
          <a href="#planos">Planos</a>
          <a className="navSchedule" href="/agendar">
            Agendar
          </a>
          <a href="#duvidas">Dúvidas</a>
        </nav>
        <div>
          <a className="navLogin" href="/login">
            Entrar
          </a>
          <a className="navCta" href="/cadastro">
            Teste grátis
          </a>
        </div>
      </header>
      <section className="hero">
        <div className="heroCopy">
          <p>
            <Sparkles />
            BARBEARIAS PERTO. HORÁRIOS EM TEMPO REAL.
          </p>
          <h1>Seu próximo corte começa com uma escolha simples.</h1>
          <span>
            Encontre barbearias, compare serviços, escolha seu profissional e
            reserve online. Para quem atende, toda a gestão em um único lugar.
          </span>
          <div className="heroActions">
            <a href="/agendar">
              Agendar um horário <ArrowRight />
            </a>
            <a href="/cadastro">Cadastrar minha barbearia</a>
          </div>
          <small>
            <Check />
            14 dias para testar <Check />
            Agendamento gratuito <Check />
            Configuração rápida
          </small>
        </div>
        <div className="heroVisual heroPhoto">
          <img
            src="/navalha-premium-hero.png"
            alt="Barbeiro atendendo um cliente em uma barbearia moderna"
          />
          <div className="heroPhotoBadge">
            <i />
            <span>
              <b>Agenda online</b>
              <small>Aberta 24 horas para seus clientes</small>
            </span>
          </div>
          <div className="heroPhotoCard">
            <span>
              <Scissors />
            </span>
            <div>
              <small>AGENDE ONLINE</small>
              <b>Escolha sua barbearia e reserve agora.</b>
            </div>
            <a href="/agendar">
              <ArrowRight />
            </a>
          </div>
        </div>
      </section>
      <section className="trustStrip">
        <span>Feito para barbearias independentes, equipes e redes</span>
        <b>Agenda</b>
        <b>Clientes</b>
        <b>Equipe</b>
        <b>Financeiro</b>
        <b>WhatsApp</b>
      </section>
      <section className="clientJourney" id="agendamento">
        <div
          className="clientJourneyPhoto"
          role="img"
          aria-label="Atendimento em uma barbearia moderna"
        />
        <div className="clientJourneyCopy">
          <p>PARA QUEM QUER CUIDAR DO VISUAL</p>
          <h2>Escolha. Agende. Chegue no horário.</h2>
          <span>
            O Navalha conecta você às barbearias cadastradas e mostra serviços,
            profissionais e horários disponíveis em um único fluxo.
          </span>
          <div>
            <article>
              <i>
                <MapPin />
              </i>
              <b>Escolha a barbearia</b>
              <small>Encontre onde deseja ser atendido.</small>
            </article>
            <article>
              <i>
                <Scissors />
              </i>
              <b>Defina o serviço</b>
              <small>Selecione atendimento e profissional.</small>
            </article>
            <article>
              <i>
                <Clock3 />
              </i>
              <b>Reserve o horário</b>
              <small>Confirme seus dados em poucos minutos.</small>
            </article>
          </div>
          <a href="/agendar">
            Encontrar uma barbearia <ArrowRight />
          </a>
        </div>
      </section>
      <section className="landingSection" id="recursos">
        <div className="sectionIntro">
          <p>TUDO EM UM SÓ LUGAR</p>
          <h2>
            Menos tarefas manuais.
            <br />
            Mais tempo para atender.
          </h2>
          <span>
            Uma operação completa e conectada, sem planilhas espalhadas.
          </span>
        </div>
        <div className="featureGrid">
          <Feature
            icon={<CalendarCheck />}
            title="Agenda inteligente"
            text="Horários, disponibilidade, bloqueios e agendamento online sem conflitos."
          />
          <Feature
            icon={<Users />}
            title="Clientes e equipe"
            text="Histórico de clientes, acessos individuais, barbeiros e comissões."
          />
          <Feature
            icon={<ChartNoAxesCombined />}
            title="Financeiro real"
            text="Pagamentos, receita, fechamento e relatórios para decisões melhores."
          />
          <Feature
            icon={<MessageCircle />}
            title="Relacionamento"
            text="Confirmações e lembretes preparados para integração com WhatsApp."
          />
          <Feature
            icon={<ShieldCheck />}
            title="Seguro e profissional"
            text="Dados separados por empresa, permissões e auditoria das operações."
          />
          <Feature
            icon={<Scissors />}
            title="Feito para o setor"
            text="Serviços, duração, profissionais e rotina pensados para barbearias."
          />
        </div>
      </section>
      <section className="howSection">
        <div>
          <p>COMECE EM MINUTOS</p>
          <h2>Do cadastro ao primeiro agendamento.</h2>
        </div>
        <div>
          {[
            ["01", "Crie sua barbearia"],
            ["02", "Cadastre equipe e serviços"],
            ["03", "Compartilhe sua agenda online"],
          ].map((x) => (
            <article key={x[0]}>
              <b>{x[0]}</b>
              <h3>{x[1]}</h3>
              <span>
                Uma configuração guiada e direta para colocar sua operação em
                movimento.
              </span>
            </article>
          ))}
        </div>
      </section>
      <section className="landingSection plansSection" id="planos">
        <div className="sectionIntro centered">
          <p>PLANOS PARA CADA MOMENTO</p>
          <h2>Comece pequeno. Cresça sem trocar de sistema.</h2>
        </div>
        <div className="landingPlans">
          {plans.map((p) => (
            <article key={p.name} className={p.featured ? "featured" : ""}>
              {p.featured && <em>MAIS ESCOLHIDO</em>}
              <small>PLANO</small>
              <h3>{p.name}</h3>
              <p>{p.description}</p>
              <strong>
                <sup>R$</sup>
                {p.price}
                <i>/mês</i>
              </strong>
              {p.items.map((x) => (
                <span key={x}>
                  <Check />
                  {x}
                </span>
              ))}
              <a href="/cadastro">Testar grátis</a>
            </article>
          ))}
        </div>
      </section>
      <section className="faqSection" id="duvidas">
        <div>
          <p>DÚVIDAS FREQUENTES</p>
          <h2>Pronto para organizar sua barbearia?</h2>
          <a href="/cadastro">
            Criar minha conta <ArrowRight />
          </a>
        </div>
        <div>
          <details open>
            <summary>Preciso instalar algum programa?</summary>
            <p>
              Não. O Navalha funciona online no computador, tablet ou celular.
            </p>
          </details>
          <details>
            <summary>Meus clientes conseguem agendar sozinhos?</summary>
            <p>
              Sim. O cliente escolhe a barbearia no portal público e conclui o
              agendamento com serviço, profissional, data e horário.
            </p>
          </details>
          <details>
            <summary>Posso cadastrar minha equipe?</summary>
            <p>
              Sim. Cada profissional pode ter acesso próprio, agenda e comissão.
            </p>
          </details>
          <details>
            <summary>Consigo mudar de plano depois?</summary>
            <p>
              Sim. A troca pode ser solicitada diretamente na área de
              assinatura.
            </p>
          </details>
        </div>
      </section>
      <footer className="landingFooter">
        <a href="/" className="landingBrand">
          <span>
            <Scissors />
          </span>
          <div>
            NAVALHA<small>GESTÃO PARA BARBEARIAS</small>
          </div>
        </a>
        <p>Agenda, gestão e crescimento para barbearias.</p>
        <nav>
          <a href="/login">Entrar na empresa</a>
          <a href="/cadastro">Criar conta</a>
          <a href="/login-plataforma">Portal SaaS</a>
          <a href="/privacidade">Privacidade</a>
          <a href="/termos">Termos</a>
          <a href="/instalar">Instalar aplicativo</a>
        </nav>
        <small>
          © {new Date().getFullYear()} Navalha. Todos os direitos reservados.
        </small>
      </footer>
    </main>
  );
}
function Feature({
  icon,
  title,
  text,
}: {
  icon: any;
  title: string;
  text: string;
}) {
  return (
    <article>
      <span>{icon}</span>
      <h3>{title}</h3>
      <p>{text}</p>
    </article>
  );
}
