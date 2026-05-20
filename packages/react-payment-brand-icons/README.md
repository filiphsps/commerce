# react-payment-brand-icons

Tree-shakeable React components for payment-method brand icons (Visa, Mastercard, Apple Pay, Swish, and 460+ more).

## Installation

```bash
npm install react-payment-brand-icons
# or
pnpm add react-payment-brand-icons
```

## Requirements

- React 18 or 19

## Usage

```tsx
import { VisaIcon } from 'react-payment-brand-icons/icons/visa';

export default function Checkout() {
    return <VisaIcon width={48} height={32} />;
}
```

You can also import from the barrel (larger bundle — tree-shaking recommended):

```tsx
import { VisaIcon, MastercardIcon } from 'react-payment-brand-icons';
```

## Icon manifest

The manifest lists every available icon slug and its display name:

```ts
import { manifest } from 'react-payment-brand-icons/manifest';

console.log(manifest);
// [{ slug: 'visa', name: 'Visa' }, { slug: 'mastercard', name: 'Mastercard' }, ...]
```

## Props

Every icon component accepts standard SVG props (`width`, `height`, `className`, `style`, `aria-label`, etc.).

| Prop        | Type     | Default |
| ----------- | -------- | ------- |
| `width`     | `number` | `38`    |
| `height`    | `number` | `24`    |
| `className` | `string` | —       |

## Available icons

<!-- BEGIN_ICON_LIST -->
| Slug | Component | Title |
|---|---|---|
| `acima_leasing` | `AcimaLeasing` | Acima Leasing |
| `addi` | `Addi` | Addi |
| `aeropay` | `Aeropay` | Aeropay |
| `affinbank` | `Affinbank` | Affinbank |
| `affirm` | `Affirm` | Affirm |
| `aftee` | `Aftee` | Aftee |
| `afterpay` | `Afterpay` | Afterpay |
| `afterpay_paynl_version` | `AfterpayPaynlVersion` | Afterpay Paynl Version |
| `airtel_money` | `AirtelMoney` | Airtel Money |
| `airteltigo_mobile_money` | `AirteltigoMobileMoney` | Airteltigo Mobile Money |
| `aktia` | `Aktia` | Aktia |
| `akulaku` | `Akulaku` | Akulaku |
| `akulakupaylater` | `Akulakupaylater` | Akulakupaylater |
| `alandsbanken` | `Alandsbanken` | Alandsbanken |
| `alfamart` | `Alfamart` | Alfamart |
| `alfamidi` | `Alfamidi` | Alfamidi |
| `alipay` | `Alipay` | Alipay |
| `alipay_hk` | `AlipayHk` | Alipay Hk |
| `alipaypaynlversion` | `Alipaypaynlversion` | Alipaypaynlversion |
| `alliancebank` | `Alliancebank` | Alliancebank |
| `alma` | `Alma` | Alma |
| `amazon` | `Amazon` | Amazon |
| `ambank` | `Ambank` | Ambank |
| `american_express` | `AmericanExpress` | American Express |
| `anyday` | `Anyday` | Anyday |
| `apecoin` | `Apecoin` | Apecoin |
| `aplazo` | `Aplazo` | Aplazo |
| `apple_pay` | `ApplePay` | Apple Pay |
| `aqsat` | `Aqsat` | Aqsat |
| `arhaus` | `Arhaus` | Arhaus |
| `arvato` | `Arvato` | Arvato |
| `ask` | `Ask` | Ask |
| `astrapay` | `Astrapay` | Astrapay |
| `atmbersama` | `Atmbersama` | Atmbersama |
| `atobaraidotcom` | `Atobaraidotcom` | Atobaraidotcom |
| `atome` | `Atome` | Atome |
| `atone` | `Atone` | Atone |
| `atrato` | `Atrato` | Atrato |
| `au_kantan_kessai` | `AuKantanKessai` | Au Kantan Kessai |
| `axs` | `Axs` | Axs |
| `bancnet` | `Bancnet` | Bancnet |
| `bancontact` | `Bancontact` | Bancontact |
| `bangkokbank` | `Bangkokbank` | Bangkokbank |
| `bankislam` | `Bankislam` | Bankislam |
| `bankmuamalat` | `Bankmuamalat` | Bankmuamalat |
| `bankrakyat` | `Bankrakyat` | Bankrakyat |
| `bbvacie` | `Bbvacie` | Bbvacie |
| `bc_card` | `BcCard` | Bc Card |
| `bca` | `Bca` | Bca |
| `bcaklikpay` | `Bcaklikpay` | Bcaklikpay |
| `bdo` | `Bdo` | Bdo |
| `belfius` | `Belfius` | Belfius |
| `benefit` | `Benefit` | Benefit |
| `bierchequepaynlversion` | `Bierchequepaynlversion` | Bierchequepaynlversion |
| `bigc` | `Bigc` | Bigc |
| `billease` | `Billease` | Billease |
| `billerpaynlversion` | `Billerpaynlversion` | Billerpaynlversion |
| `billie` | `Billie` | Billie |
| `billink` | `Billink` | Billink |
| `billinkmethod` | `Billinkmethod` | Billinkmethod |
| `bitcoin` | `Bitcoin` | Bitcoin |
| `bitcoin_cash` | `BitcoinCash` | Bitcoin Cash |
| `bizum` | `Bizum` | Bizum |
| `blik` | `Blik` | BLIK |
| `bnbchain` | `Bnbchain` | Bnbchain |
| `bni` | `Bni` | Bni |
| `bogus` | `Bogus` | Bogus |
| `bogus_app_coin` | `BogusAppCoin` | Bogus App Coin |
| `boleto` | `Boleto` | Boleto |
| `boodil` | `Boodil` | Boodil |
| `boost` | `Boost` | Boost |
| `bpi` | `Bpi` | Bpi |
| `bread` | `Bread` | Bread |
| `breadpay` | `Breadpay` | Breadpay |
| `bri` | `Bri` | Bri |
| `bri_direct_debit` | `BriDirectDebit` | Bri Direct Debit |
| `brimo` | `Brimo` | Brimo |
| `bsi` | `Bsi` | Bsi |
| `bsn` | `Bsn` | Bsn |
| `bss` | `Bss` | Bss |
| `busd` | `Busd` | Busd |
| `careempay` | `Careempay` | Careempay |
| `cartes_bancaires` | `CartesBancaires` | Cartes Bancaires |
| `cash` | `Cash` | Cash |
| `cashapppay` | `Cashapppay` | Cashapppay |
| `catchpayments` | `Catchpayments` | Catchpayments |
| `cebuana` | `Cebuana` | Cebuana |
| `cetelem` | `Cetelem` | Cetelem |
| `checkout_finance` | `CheckoutFinance` | Checkout Finance |
| `cimb` | `Cimb` | Cimb |
| `cimbclicks` | `Cimbclicks` | Cimbclicks |
| `circlek` | `Circlek` | Circlek |
| `citadele` | `Citadele` | Citadele |
| `citipay` | `Citipay` | Citipay |
| `clavetelered` | `Clavetelered` | Clavetelered |
| `clearpay` | `Clearpay` | Clearpay |
| `clerq` | `Clerq` | Clerq |
| `cleverpay` | `Cleverpay` | Cleverpay |
| `cliq` | `Cliq` | Cliq |
| `coinsph` | `Coinsph` | Coinsph |
| `collector_bank` | `CollectorBank` | Collector Bank |
| `coop` | `Coop` | Coop |
| `coppelpay` | `Coppelpay` | Coppelpay |
| `creditclickpaynlversion` | `Creditclickpaynlversion` | Creditclickpaynlversion |
| `creditkey` | `Creditkey` | Creditkey |
| `credix` | `Credix` | Credix |
| `d_barai` | `DBarai` | D Barai |
| `dai` | `Dai` | Dai |
| `dailyyamazaki` | `Dailyyamazaki` | Dailyyamazaki |
| `dana` | `Dana` | Dana |
| `danamononline` | `Danamononline` | Danamononline |
| `dandan` | `Dandan` | Dandan |
| `dankort` | `Dankort` | Dankort |
| `danske_bank` | `DanskeBank` | Danske Bank |
| `dash` | `Dash` | Dash |
| `depay` | `Depay` | Depay |
| `deutschebank` | `Deutschebank` | Deutschebank |
| `diners_club` | `DinersClub` | Diners Club |
| `directa24` | `Directa24` | Directa24 |
| `directpay` | `Directpay` | Directpay |
| `discover` | `Discover` | Discover |
| `divido` | `Divido` | Divido |
| `dnb` | `Dnb` | Dnb |
| `docomo_barai` | `DocomoBarai` | Docomo Barai |
| `dogecoin` | `Dogecoin` | Dogecoin |
| `dropp` | `Dropp` | Dropp |
| `duologi` | `Duologi` | Duologi |
| `dwolla` | `Dwolla` | Dwolla |
| `ebucks` | `Ebucks` | Ebucks |
| `echelon_financing` | `EchelonFinancing` | Echelon Financing |
| `ecpay` | `Ecpay` | Ecpay |
| `eft_secure` | `EftSecure` | Eft Secure |
| `eghl` | `Eghl` | Eghl |
| `elo` | `Elo` | Elo |
| `elv` | `Elv` | Elv |
| `enets` | `Enets` | Enets |
| `eos` | `Eos` | Eos |
| `epayments` | `Epayments` | Epayments |
| `epospay` | `Epospay` | Epospay |
| `eps` | `Eps` | Eps |
| `esr_paymentslip_switzerland` | `EsrPaymentslipSwitzerland` | Esr Paymentslip Switzerland |
| `ethereum` | `Ethereum` | Ethereum |
| `etika` | `Etika` | Etika |
| `ewalletindonesia` | `Ewalletindonesia` | Ewalletindonesia |
| `facebook_pay` | `FacebookPay` | Facebook Pay |
| `fairstonepayments` | `Fairstonepayments` | Fairstonepayments |
| `familymart` | `Familymart` | Familymart |
| `farmlands` | `Farmlands` | Farmlands |
| `fashioncheque` | `Fashioncheque` | Fashioncheque |
| `fashiongiftcardpaynlversion` | `Fashiongiftcardpaynlversion` | Fashiongiftcardpaynlversion |
| `fawry` | `Fawry` | Fawry |
| `finloup` | `Finloup` | Finloup |
| `fintecture` | `Fintecture` | Fintecture |
| `flexiti` | `Flexiti` | Flexiti |
| `forbrugsforeningen` | `Forbrugsforeningen` | Forbrugsforeningen |
| `fortiva` | `Fortiva` | Fortiva |
| `fps` | `Fps` | Fps |
| `fpx` | `Fpx` | Fpx |
| `freecharge` | `Freecharge` | Freecharge |
| `freedompay` | `Freedompay` | Freedompay |
| `futurepaymytab` | `Futurepaymytab` | Futurepaymytab |
| `gcash` | `Gcash` | Gcash |
| `generalfinancing` | `Generalfinancing` | Generalfinancing |
| `generic` | `Generic` | Generic |
| `genoapay` | `Genoapay` | Genoapay |
| `gezondheidsbonpaynlversion` | `Gezondheidsbonpaynlversion` | Gezondheidsbonpaynlversion |
| `gift-card` | `GiftCard` | Gift Card |
| `giropay` | `Giropay` | Giropay |
| `givacard` | `Givacard` | Givacard |
| `gmo-postpay` | `GmoPostpay` | Gmo Postpay |
| `gmobanktransfer` | `Gmobanktransfer` | Gmobanktransfer |
| `google_pay` | `GooglePay` | Google Pay |
| `google_wallet` | `GoogleWallet` | Google Wallet |
| `gopay` | `Gopay` | Gopay |
| `grabpay` | `Grabpay` | Grabpay |
| `grailpay` | `Grailpay` | Grailpay |
| `gusd` | `Gusd` | Gusd |
| `hana_card` | `HanaCard` | Hana Card |
| `handelsbanken` | `Handelsbanken` | Handelsbanken |
| `happypay` | `Happypay` | Happypay |
| `helloclever` | `Helloclever` | Helloclever |
| `homecredit` | `Homecredit` | Homecredit |
| `hongleongbank` | `Hongleongbank` | Hongleongbank |
| `hongleongconnect` | `Hongleongconnect` | Hongleongconnect |
| `hsbc` | `Hsbc` | Hsbc |
| `humm` | `Humm` | Humm |
| `hyper` | `Hyper` | Hyper |
| `hypercard` | `Hypercard` | Hypercard |
| `hypercash` | `Hypercash` | Hypercash |
| `hyundai_card` | `HyundaiCard` | Hyundai Card |
| `ideal` | `Ideal` | iDEAL |
| `in3` | `In3` | In3 |
| `inbank` | `Inbank` | Inbank |
| `indomaret` | `Indomaret` | Indomaret |
| `ing_homepay` | `IngHomepay` | Ing Homepay |
| `interac` | `Interac` | Interac |
| `ivy` | `Ivy` | Ivy |
| `jcb` | `Jcb` | JCB |
| `jousto` | `Jousto` | Jousto |
| `kakao_pay` | `KakaoPay` | Kakao Pay |
| `kakebaraidotcom` | `Kakebaraidotcom` | Kakebaraidotcom |
| `kasikornbank` | `Kasikornbank` | Kasikornbank |
| `kb_card` | `KbCard` | Kb Card |
| `kbc_cbc` | `KbcCbc` | Kbc Cbc |
| `kfast` | `Kfast` | Kfast |
| `klarna` | `Klarna` | Klarna |
| `klarna-pay-later` | `KlarnaPayLater` | Klarna Pay Later |
| `klarna-pay-now` | `KlarnaPayNow` | Klarna Pay Now |
| `klarna-slice-it` | `KlarnaSliceIt` | Klarna Slice It |
| `knet` | `Knet` | Knet |
| `krediidipank` | `Krediidipank` | Krediidipank |
| `kredivo` | `Kredivo` | Kredivo |
| `krungsri` | `Krungsri` | Krungsri |
| `krungthaibank` | `Krungthaibank` | Krungthaibank |
| `kueskipay` | `Kueskipay` | Kueskipay |
| `kunstencultuurcadeaukaart` | `Kunstencultuurcadeaukaart` | Kunstencultuurcadeaukaart |
| `kuwaitfinancehouse` | `Kuwaitfinancehouse` | Kuwaitfinancehouse |
| `laser` | `Laser` | Laser |
| `latitude_creditline_au` | `LatitudeCreditlineAu` | Latitude Creditline Au |
| `latitude_gem_au` | `LatitudeGemAu` | Latitude Gem Au |
| `latitude_gem_nz` | `LatitudeGemNz` | Latitude Gem Nz |
| `latitude_go_au` | `LatitudeGoAu` | Latitude Go Au |
| `latitudepay` | `Latitudepay` | Latitudepay |
| `lawson` | `Lawson` | Lawson |
| `laybuy` | `Laybuy` | Laybuy |
| `laybuyheart` | `Laybuyheart` | Laybuyheart |
| `lbc` | `Lbc` | Lbc |
| `lhv` | `Lhv` | Lhv |
| `line_pay` | `LinePay` | Line Pay |
| `linkaja` | `Linkaja` | Linkaja |
| `linkpay` | `Linkpay` | Linkpay |
| `litecoin` | `Litecoin` | Litecoin |
| `lku` | `Lku` | Lku |
| `lotte_card` | `LotteCard` | Lotte Card |
| `luminor` | `Luminor` | Luminor |
| `lydia` | `Lydia` | Lydia |
| `mach` | `Mach` | Mach |
| `mada` | `Mada` | Mada |
| `maestro` | `Maestro` | Maestro |
| `mandiri` | `Mandiri` | Mandiri |
| `mash` | `Mash` | Mash |
| `mastercard` | `Mastercard` | Mastercard |
| `masterpass` | `Masterpass` | Masterpass |
| `maxima` | `Maxima` | Maxima |
| `maya` | `Maya` | Maya |
| `mayabank` | `Mayabank` | Mayabank |
| `maybank` | `Maybank` | Maybank |
| `maybankm2u` | `Maybankm2u` | Maybankm2u |
| `maybankqrpay` | `Maybankqrpay` | Maybankqrpay |
| `mb` | `Mb` | Mb |
| `mbway` | `Mbway` | Mbway |
| `mcash` | `Mcash` | Mcash |
| `medicinosbankas` | `Medicinosbankas` | Medicinosbankas |
| `meeza` | `Meeza` | Meeza |
| `merpay` | `Merpay` | Merpay |
| `metapay` | `Metapay` | Metapay |
| `ministop` | `Ministop` | Ministop |
| `mobicred` | `Mobicred` | Mobicred |
| `mobikwik` | `Mobikwik` | Mobikwik |
| `mobilepay` | `Mobilepay` | Mobilepay |
| `mode` | `Mode` | Mode |
| `mokka` | `Mokka` | Mokka |
| `momopay` | `Momopay` | Momopay |
| `mondido` | `Mondido` | Mondido |
| `monero` | `Monero` | Monero |
| `mpesa` | `Mpesa` | Mpesa |
| `mtn_mobile_money` | `MtnMobileMoney` | Mtn Mobile Money |
| `mybank` | `Mybank` | Mybank |
| `myfatoorah` | `Myfatoorah` | Myfatoorah |
| `n26` | `N26` | N26 |
| `naps` | `Naps` | Naps |
| `nationalebioscoopbon` | `Nationalebioscoopbon` | Nationalebioscoopbon |
| `nationaleentertainmentcard` | `Nationaleentertainmentcard` | Nationaleentertainmentcard |
| `naver_pay` | `NaverPay` | Naver Pay |
| `nelo` | `Nelo` | Nelo |
| `netbanking` | `Netbanking` | Netbanking |
| `neteller` | `Neteller` | Neteller |
| `nh_card` | `NhCard` | Nh Card |
| `nordea` | `Nordea` | Nordea |
| `novuna` | `Novuna` | Novuna |
| `ocbcbank` | `Ocbcbank` | Ocbcbank |
| `octoclicks` | `Octoclicks` | Octoclicks |
| `ola_money` | `OlaMoney` | Ola Money |
| `omasp` | `Omasp` | Omasp |
| `op` | `Op` | Op |
| `opay` | `Opay` | Opay |
| `openpay` | `Openpay` | Openpay |
| `ovo` | `Ovo` | Ovo |
| `oxxo` | `Oxxo` | Oxxo |
| `ozow` | `Ozow` | Ozow |
| `pagoefectivo` | `Pagoefectivo` | Pagoefectivo |
| `paid` | `Paid` | Paid |
| `paidy` | `Paidy` | Paidy |
| `palawa` | `Palawa` | Palawa |
| `palawan` | `Palawan` | Palawan |
| `pay_easy` | `PayEasy` | Pay Easy |
| `pay_pay` | `PayPay` | Pay Pay |
| `paybylink` | `Paybylink` | Paybylink |
| `payco` | `Payco` | Payco |
| `payconiq` | `Payconiq` | Payconiq |
| `payd` | `Payd` | Payd |
| `payfast_instant_eft` | `PayfastInstantEft` | Payfast Instant Eft |
| `payflex` | `Payflex` | Payflex |
| `payid` | `Payid` | Payid |
| `payjustnow` | `Payjustnow` | Payjustnow |
| `paymark_online_eftpos` | `PaymarkOnlineEftpos` | Paymark Online Eftpos |
| `paymaya` | `Paymaya` | Paymaya |
| `payme` | `Payme` | Payme |
| `paynow` | `Paynow` | Paynow |
| `payoo` | `Payoo` | Payoo |
| `payooqr` | `Payooqr` | Payooqr |
| `paypal` | `Paypal` | PayPal |
| `payplan` | `Payplan` | Payplan |
| `paypo` | `Paypo` | Paypo |
| `paysafecard` | `Paysafecard` | Paysafecard |
| `paysafecardpaynlversion` | `Paysafecardpaynlversion` | Paysafecardpaynlversion |
| `paysafecash` | `Paysafecash` | Paysafecash |
| `paysera` | `Paysera` | Paysera |
| `paytm` | `Paytm` | Paytm |
| `payto` | `Payto` | Payto |
| `paytomorrow` | `Paytomorrow` | Paytomorrow |
| `payu` | `Payu` | Payu |
| `payzapp` | `Payzapp` | Payzapp |
| `pei` | `Pei` | Pei |
| `perlasfinance` | `Perlasfinance` | Perlasfinance |
| `permata` | `Permata` | Permata |
| `pivo` | `Pivo` | Pivo |
| `pix` | `Pix` | Pix |
| `podiumcadeaukaart` | `Podiumcadeaukaart` | Podiumcadeaukaart |
| `poli` | `Poli` | Poli |
| `polygon` | `Polygon` | Polygon |
| `pop-pankki` | `PopPankki` | Pop Pankki |
| `postfinance_card` | `PostfinanceCard` | Postfinance Card |
| `postfinance_efinance` | `PostfinanceEfinance` | Postfinance Efinance |
| `postpay` | `Postpay` | Postpay |
| `prepaysolutions` | `Prepaysolutions` | Prepaysolutions |
| `przelew24` | `Przelew24` | Przelew24 |
| `przelewytwofourpaynlversion` | `Przelewytwofourpaynlversion` | Przelewytwofourpaynlversion |
| `publicbank` | `Publicbank` | Publicbank |
| `publicbank_pbe` | `PublicbankPbe` | Publicbank Pbe |
| `qr_promptpay` | `QrPromptpay` | Qr Promptpay |
| `qris` | `Qris` | Qris |
| `qrph` | `Qrph` | Qrph |
| `rabbitlinepay` | `Rabbitlinepay` | Rabbitlinepay |
| `rakuten_pay` | `RakutenPay` | Rakuten Pay |
| `rapidtransfer` | `Rapidtransfer` | Rapidtransfer |
| `ratepay` | `Ratepay` | Ratepay |
| `rcbc` | `Rcbc` | Rcbc |
| `rcs` | `Rcs` | Rcs |
| `revolut` | `Revolut` | Revolut |
| `rhbbank` | `Rhbbank` | Rhbbank |
| `rhbnow` | `Rhbnow` | Rhbnow |
| `rietumu` | `Rietumu` | Rietumu |
| `rivertypaynlversion` | `Rivertypaynlversion` | Rivertypaynlversion |
| `rupay` | `Rupay` | Rupay |
| `s-pankki` | `SPankki` | S Pankki |
| `saastopankki` | `Saastopankki` | Saastopankki |
| `sadad` | `Sadad` | Sadad |
| `sam` | `Sam` | Sam |
| `samsung_card` | `SamsungCard` | Samsung Card |
| `samsung_pay` | `SamsungPay` | Samsung Pay |
| `santander` | `Santander` | Santander |
| `satisfi` | `Satisfi` | Satisfi |
| `satispay` | `Satispay` | Satispay |
| `sbpl` | `Sbpl` | Sbpl |
| `scalapay` | `Scalapay` | Scalapay |
| `seb` | `Seb` | Seb |
| `sepa_bank_transfer` | `SepaBankTransfer` | Sepa Bank Transfer |
| `sequra` | `Sequra` | Sequra |
| `seveneleven` | `Seveneleven` | Seveneleven |
| `sezzle` | `Sezzle` | Sezzle |
| `shib` | `Shib` | Shib |
| `shinhan_card` | `ShinhanCard` | Shinhan Card |
| `shopeepay` | `Shopeepay` | Shopeepay |
| `shopify_pay` | `ShopifyPay` | Shopify Pay |
| `siamcommercial` | `Siamcommercial` | Siamcommercial |
| `siauliubankas` | `Siauliubankas` | Siauliubankas |
| `siirto` | `Siirto` | Siirto |
| `sikafsa` | `Sikafsa` | Sikafsa |
| `sikahsa` | `Sikahsa` | Sikahsa |
| `sinpemovil` | `Sinpemovil` | Sinpemovil |
| `skeps` | `Skeps` | Skeps |
| `skrilldigitalwallet` | `Skrilldigitalwallet` | Skrilldigitalwallet |
| `smartpay` | `Smartpay` | Smartpay |
| `snap_checkout` | `SnapCheckout` | Snap Checkout |
| `sofort` | `Sofort` | Sofort |
| `softbank` | `Softbank` | Softbank |
| `solana` | `Solana` | Solana |
| `solanapay` | `Solanapay` | Solanapay |
| `spei` | `Spei` | Spei |
| `splitit` | `Splitit` | Splitit |
| `spotii` | `Spotii` | Spotii |
| `spraypay` | `Spraypay` | Spraypay |
| `standardchartered` | `Standardchartered` | Standardchartered |
| `stcpay` | `Stcpay` | Stcpay |
| `sunkus` | `Sunkus` | Sunkus |
| `superpayments` | `Superpayments` | Superpayments |
| `sveab2bfaktura` | `Sveab2bfaktura` | Sveab2bfaktura |
| `sveab2binvoice` | `Sveab2binvoice` | Sveab2binvoice |
| `sveacreditaccount` | `Sveacreditaccount` | Sveacreditaccount |
| `sveadelbetalning` | `Sveadelbetalning` | Sveadelbetalning |
| `sveaeramaksu` | `Sveaeramaksu` | Sveaeramaksu |
| `sveafaktura` | `Sveafaktura` | Sveafaktura |
| `sveainvoice` | `Sveainvoice` | Sveainvoice |
| `svealasku` | `Svealasku` | Svealasku |
| `sveaostukonto` | `Sveaostukonto` | Sveaostukonto |
| `sveapartpayment` | `Sveapartpayment` | Sveapartpayment |
| `sveayrityslasku` | `Sveayrityslasku` | Sveayrityslasku |
| `swedbank` | `Swedbank` | Swedbank |
| `swiftpay` | `Swiftpay` | Swiftpay |
| `swish` | `Swish` | Swish |
| `swissbilling` | `Swissbilling` | Swissbilling |
| `synchrony` | `Synchrony` | Synchrony |
| `synchrony_pay` | `SynchronyPay` | Synchrony Pay |
| `tabby` | `Tabby` | Tabby |
| `tabit` | `Tabit` | Tabit |
| `tamara` | `Tamara` | Tamara |
| `tandympayment` | `Tandympayment` | Tandympayment |
| `tbibank` | `Tbibank` | Tbibank |
| `tendopay` | `Tendopay` | Tendopay |
| `tensile` | `Tensile` | Tensile |
| `tescolotus` | `Tescolotus` | Tescolotus |
| `thanachartbank` | `Thanachartbank` | Thanachartbank |
| `toss` | `Toss` | Toss |
| `touchngo` | `Touchngo` | Touchngo |
| `trevipay` | `Trevipay` | Trevipay |
| `truemoney_pay` | `TruemoneyPay` | Truemoney Pay |
| `trustly` | `Trustly` | Trustly |
| `twigpay` | `Twigpay` | Twigpay |
| `twint` | `Twint` | TWINT |
| `uaevisa` | `Uaevisa` | Uaevisa |
| `uangme` | `Uangme` | Uangme |
| `ubp` | `Ubp` | Ubp |
| `unionpay` | `UnionPay` | UnionPay |
| `unipay` | `Unipay` | Unipay |
| `uob` | `Uob` | Uob |
| `uobezpay` | `Uobezpay` | Uobezpay |
| `uobthai` | `Uobthai` | Uobthai |
| `upi` | `Upi` | Upi |
| `urpay` | `Urpay` | Urpay |
| `usdc` | `Usdc` | Usdc |
| `usdp` | `Usdp` | Usdp |
| `v_pay` | `VPay` | V Pay |
| `valu` | `Valu` | Valu |
| `venmo` | `Venmo` | Venmo |
| `viabill` | `Viabill` | Viabill |
| `vipps` | `Vipps` | Vipps |
| `visa` | `Visa` | Visa |
| `visaelectron` | `Visaelectron` | Visaelectron |
| `vvv_giftcard` | `VvvGiftcard` | Vvv Giftcard |
| `vvvcadeaukaartpaynlversion` | `Vvvcadeaukaartpaynlversion` | Vvvcadeaukaartpaynlversion |
| `walley` | `Walley` | Walley |
| `wbtc` | `Wbtc` | Wbtc |
| `webshopgiftcard` | `Webshopgiftcard` | Webshopgiftcard |
| `wechatpay` | `Wechatpay` | WeChat Pay |
| `wechatpaynlversion` | `Wechatpaynlversion` | Wechatpaynlversion |
| `wegetfinancing` | `Wegetfinancing` | Wegetfinancing |
| `xrp` | `Xrp` | Xrp |
| `ymobile` | `Ymobile` | Ymobile |
| `younitedpay` | `Younitedpay` | Younitedpay |
| `zalopay` | `Zalopay` | Zalopay |
| `zapper` | `Zapper` | Zapper |
| `zinia` | `Zinia` | Zinia |
| `zip` | `Zip` | Zip |
| `zoodpay` | `Zoodpay` | Zoodpay |
<!-- END_ICON_LIST -->

