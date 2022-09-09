import React from 'react'
import {useState,useEffect} from 'react'
import {useSession} from 'next-auth/react'

import { XIcon } from '@heroicons/react/outline';

import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';

import Tags from '../utils/Tags'
import IssueState from '../utils/IssueState'

import {ethers} from 'ethers'
declare let window:any
import DaoAbi from "../ContractFunctions/DaoABI.json"
import TokenAbi from "../ContractFunctions/TokenABI.json"

import {timeAgo} from '../../utils/timeUtils'

interface IssueActionProps {
    setPopupState: React.Dispatch<React.SetStateAction<string>>;
    DaoInfo: any;
    popupIssueID: number;
}

interface PieChartProps{
    pieData: any;
}

ChartJS.register(ArcElement, Tooltip, Legend);

const PieChart: React.FC<PieChartProps> = ({pieData}) => {
    const pieColors = ['#6495ED','#0047AB','#00008B','#3F00FF','#5D3FD3','#4169E1'];

    const options = {
        plugins: {
            tooltip: {
                enabled: false,
            }
        }
    }

    const data = {
        datasets: [
            {
                data: pieData,
                backgroundColor: pieColors,
                borderWidth: 0,
                rotation:-10,
            },
        ],
    };

    const nullData = {
        datasets: [
            {
                data: [1],
                backgroundColor: ['#7B7C7D'],
                borderWidth: 0,
                rotation:-10,
            },
        ],
    };

    return (
        <div className='w-[40%] mb-[2%]'>
            <Doughnut data={(pieData.length===1 && pieData[0]===0)?nullData:data} options={options} />
        </div>
    )
}

const IssueAction: React.FC<IssueActionProps> = ({setPopupState,DaoInfo,popupIssueID}) => {

    const {data:session} = useSession()

    const [IssuesList,setIssuesList] = useState<any>()
    const [addStake,setAddStake] = useState<number>()

    const [PrLink,setPrLink] = useState<string>('')

    const getTheIssue = async () => {
        //web3
        let provider :ethers.providers.Web3Provider = new ethers.providers.Web3Provider(window.ethereum) ;
        let signer: ethers.providers.JsonRpcSigner = provider.getSigner();
        let DaoContract : ethers.Contract = new ethers.Contract(DaoInfo.DAO, DaoAbi , signer);
        const issueRes = await DaoContract.repoIssues(popupIssueID);

        //getting stakers data for PieChart
        const stakersRes = [];
        const stakesArr = [];
        let _calcTotalStaked = 0;
        let _doCalc = true;
        let _calcIndex = 0;
        while(_doCalc){
            const stakersOne = await DaoContract.stakers(popupIssueID,_calcIndex);
            _calcTotalStaked += Number(stakersOne.amount);
            stakersRes.push(stakersOne);
            stakesArr.push(Number(stakersOne.amount));
            if(_calcTotalStaked === Number(issueRes.totalStaked)){
                _doCalc=false
            }
            _calcIndex++;
        }

        //metadata of DAO
        const DaoMetadata = await DaoContract.METADATA();
        const DaoRes = await fetch(`https://gateway.ipfs.io/ipfs/${DaoMetadata}`).then(res=>res.json());
        DaoRes.tokenImg = `https://gateway.ipfs.io/ipfs/${DaoRes.tokenImg}`

        //Token Balance of user
        const DaoTokenAddress = await DaoContract.TOKEN();
        let TokenContract : ethers.Contract = new ethers.Contract(DaoTokenAddress, TokenAbi , signer);
        const userTokenBalance = ethers.utils.formatEther(await TokenContract.balanceOf(await signer.getAddress()));

        const apiURL = await issueRes.issueURL.replace('github.com','api.github.com/repos');
        const githubRes = await fetch(apiURL).then(res=>res.json()).catch(err=>console.log(err));
        const IterIssue = {
            tokenBalance: userTokenBalance,
            stakesArr : stakesArr,
            stakersInfo: stakersRes,
            issueInfo:issueRes,
            githubInfo: githubRes,
            daoInfo: DaoRes,
        }
        // console.log(IterIssue)
        setIssuesList(IterIssue);
    }

    const StakeOnIssueFunc = async () => {
        if(addStake===undefined) return
        //web3
        let provider :ethers.providers.Web3Provider = new ethers.providers.Web3Provider(window.ethereum) ;
        let signer: ethers.providers.JsonRpcSigner = provider.getSigner();
        let DaoContract : ethers.Contract = new ethers.Contract(DaoInfo.DAO, DaoAbi , signer);

        const DaoTokenAddress = await DaoContract.TOKEN();
        let TokenContract : ethers.Contract = new ethers.Contract(DaoTokenAddress, TokenAbi , signer);

        //increase allowance
        await TokenContract.increaseAllowance(DaoInfo.DAO,ethers.utils.parseEther(addStake.toString()));

        await DaoContract.stakeOnIssue(popupIssueID,ethers.utils.parseEther(addStake.toString()));

        setPopupState('none')
        localStorage.removeItem('popupState') 
    }

    const StartVotingFunc = async () => {
        //web3
        let provider :ethers.providers.Web3Provider = new ethers.providers.Web3Provider(window.ethereum) ;
        let signer: ethers.providers.JsonRpcSigner = provider.getSigner();
        let DaoContract : ethers.Contract = new ethers.Contract(DaoInfo.DAO, DaoAbi , signer);

        await DaoContract.startVoting(popupIssueID);

        setPopupState('none')
        localStorage.removeItem('popupState')
    }

    const CheckIfCanBeContributor = () => {
        if(IssuesList===undefined) return
        for(let i=0;i<IssuesList.stakersInfo.length;i++){
            if(localStorage.getItem('currentAccount')!==null && localStorage.getItem('currentAccount')?.toLowerCase()===IssuesList.stakersInfo[i].staker.toLowerCase()){
                return false
            }
        }
        return true;
    }

    const AddPrContributor = async () => {
        if(PrLink==='') return
        if(!PrLink.startsWith('https://github.com')) return
        if(session===null || session===undefined) return
        if(localStorage.getItem('currentAccount')===null || localStorage.getItem('currentAccount')===undefined) return
        //PrChecker
        const requestOptions = {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${session?.accessToken}` },
        };
        const GithubUser = await fetch('https://api.github.com/user',requestOptions).then(res=>res.json());

        const PrlinkBreakdown = PrLink.split('/');

        const PrDetails = await fetch(`https://api.github.com/repos/${PrlinkBreakdown[3]}/${PrlinkBreakdown[4]}/pulls/${PrlinkBreakdown[6]}`).then(res=>res.json());

        if(PrDetails.user.login!==GithubUser.login) return

        const PrCommitDetails = await fetch(PrDetails.commits_url).then(res=>res.json());
        if(PrCommitDetails.length<4) return

        const ProofOfPR = [
            PrCommitDetails[0].sha,
            PrCommitDetails[1].sha,
            PrCommitDetails[PrCommitDetails.length-2].sha,
            PrCommitDetails[PrCommitDetails.length-1].sha
        ]
        //web3
        let provider :ethers.providers.Web3Provider = new ethers.providers.Web3Provider(window.ethereum) ;
        let signer: ethers.providers.JsonRpcSigner = provider.getSigner();
        let DaoContract : ethers.Contract = new ethers.Contract(DaoInfo.DAO, DaoAbi , signer);

        await DaoContract.addCollaborator(popupIssueID,PrLink,ProofOfPR);
        setPopupState('none')
        localStorage.removeItem('popupState')
    }

    useEffect(()=>{
        if(DaoInfo!==undefined && popupIssueID!==0){
            getTheIssue();
        }
    },[DaoInfo,popupIssueID])

    return (
        <div className='w-full h-screen fixed top-0 left-0 bg-[rgba(0,0,0,0.5)] z-20 
        flex items-center justify-center text-white' >
            <div className='w-[70vw] h-[75vh] bg-[#262B36] rounded-md 
            shadow-[0_4vh_4vh_5vh_rgba(0,0,0,0.3)] 
            flex flex-row items-center justify-between py-[1%] px-[1.5%]' >

                <div className='w-[66%] h-full flex flex-col justify-start items-start'>
                    <div className='flex flex-row items-center w-full flex-wrap text-[3.5vh] font-semibold' >
                        {IssuesList!==undefined && IssuesList.githubInfo.title}
                        <IssueState issueState='open' />
                    </div>
                    <div className='flex flex-row justify-between items-center w-full flex-wrap text-[2.5vh]' >
                        <div className='w-[45%] flex flex-row'>
                            <div className='' >Created by :</div> 
                            <div className=' ml-[2%] rounded-full text-gray-300 flex flex-row items-center' >
                                <img src='https://res.cloudinary.com/rohitkk432/image/upload/v1660743146/Ellipse_12_vvyjfb.png' className='h-[2.5vh] mr-[3%]' />
                                <div>/{IssuesList!==undefined && IssuesList.githubInfo.user.login}</div>
                            </div>
                        </div>
                        <div className='w-[45%] flex flex-row'>
                            <div className=' ml-[2%]' >Created at :</div> 
                            <div className=' ml-[2%] rounded-full text-gray-300' >
                                {IssuesList!==undefined && timeAgo(IssuesList.githubInfo.created_at)} ago
                            </div>
                        </div>
                    </div>
                    <div className='flex flex-row items-center w-full flex-wrap' >
                        <div className='text-[2.5vh]' >Tags :</div>
                        {IssuesList!==undefined &&
                            IssuesList.githubInfo.labels.map((tag:any,idx:number)=>{
                                return <Tags tag={tag.name} key={idx} />
                            })
                        }
                    </div>
                    <div className='flex flex-row items-center w-full flex-wrap text-[2.5vh]' >
                        <div>Issue Url :</div> 
                        <a href={IssuesList!==undefined ? IssuesList.issueInfo.issueURL:''} target="_blank" className='ml-[2%] text-gray-300 flex flex-row items-center w-[80%]'>
                            <img src='https://res.cloudinary.com/rohitkk432/image/upload/v1660743146/Ellipse_12_vvyjfb.png' className='h-[2.5vh]' />
                            <div>{IssuesList!==undefined && IssuesList.issueInfo.issueURL.replace("https://github.com","")}</div>
                        </a>
                    </div>

                    <div className='w-full h-full overflow-y-scroll border border-white 
                    p-[2.2%] mt-[4%] rounded-[2vh] customScrollbar text-[2.3vh]'>
                        {IssuesList!==undefined && IssuesList.githubInfo.body}
                    </div>
                    
                    {CheckIfCanBeContributor() && 
                    <div className='flex flex-row justify-start items-start w-full mt-[2%]'>
                        <input type="text" placeholder='PR url' className={`bg-[#121418] w-full py-[1.2%] px-[4%] text-[2vh] font-semibold rounded-l-md border-[#3A4E70] border border-r-0`} value={PrLink} onChange={(e)=>setPrLink(e.target.value)} />
                        <button onClick={AddPrContributor} className='flex flex-row justify-center items-center bg-[#91A8ED] 
                        w-[30%] py-[1%] rounded-r-[1vh] text-[2.4vh]'
                        >Add PR</button>
                    </div>
                    }

                    {DaoInfo!==undefined && localStorage.getItem('currentAccount')!==null && 
                    DaoInfo.owner.toLowerCase()===localStorage.getItem('currentAccount')?.toLowerCase() && 
                    <div className='flex flex-row justify-start items-start w-full mt-[2%]'>
                        <button className='flex flex-row justify-center items-center bg-[#91A8ED] 
                        w-[30%] py-[1%] rounded-[1vh] text-[2.7vh]'
                        onClick={StartVotingFunc} >Start Voting</button>
                    </div>
                    }

                </div>
                <div className='w-[32%] h-full flex flex-col justify-start items-end'>
                    <XIcon className='h-[4vh] mb-[4%]' 
                    onClick={()=>{
                        setPopupState('none')
                        localStorage.removeItem('popupState')
                    }}/>
                    <div className='w-full h-[91%] bg-gray-600 flex flex-col items-start justify-end 
                    py-[4%] px-[3%] rounded-[1vh] text-[2.5vh]' >
                        <div className='text-[3vh] mb-[2%]'>Top {IssuesList!==undefined && IssuesList.daoInfo.tokenSymbol} Stakers</div>

                        <div className='w-full h-[40%] flex flex-row justify-between items-center'>
                            <PieChart pieData={IssuesList!==undefined && IssuesList.stakesArr} />
                            <div className='flex flex-col items-center justify-center w-[60%] h-full customScrollbar overflow-y-scroll'>
                                {IssuesList!==undefined && 
                                    IssuesList.stakersInfo.map((staker:any,idx:number)=>{
                                        return(
                                            <div className={`w-[90%] my-[2%] text-[1.9vh] flex flex-row items-center justify-between`} key={idx} >
                                                <div className='font-semibold'>
                                                    {staker.staker.slice(0,5)+'...'+staker.staker.slice(37,42)}
                                                </div>
                                                <div className='font-semibold'>
                                                    {parseInt(ethers.utils.formatEther(staker.amount))} {IssuesList.daoInfo.tokenSymbol}
                                                </div>
                                            </div>
                                        )
                                    })
                                }
                            </div>
                        </div>

                        <div className='flex flex-row justify-center items-center border-2 border-[#91A8ED] w-full py-[2.5%] rounded-[1vh] mb-[8%] mt-[5%] text-[2.7vh]'>
                            <img src={IssuesList!==undefined && IssuesList.daoInfo.tokenImg} className='w-[4.5vh] h-[4.5vh] mr-[3%]' />
                            <div>{IssuesList!==undefined && parseInt(ethers.utils.formatEther(IssuesList.issueInfo.totalStaked))} {IssuesList!==undefined && IssuesList.daoInfo.tokenSymbol}</div>
                        </div>
                        <div className='flex flex-col w-full items-center mt-[2%] 
                        border border-b-0 rounded-t-[1vh] px-[3%] py-[1.5%]'>
                            <div className='w-full flex flex-row items-center justify-between mb-[2%]'>
                                <div className='text-[1.8vh]' >Balance:</div>
                                <div className='text-[2.3vh] font-semibold text-[#91A8ED]'>
                                    {IssuesList!==undefined && Math.round(IssuesList.tokenBalance)}
                                </div>
                            </div>
                            <div className='w-full flex flex-row items-center justify-between mb-[2%]'>
                                <div className='text-[2vh] px-[7%] py-[1%] bg-[#272A36] rounded-[1.5vh]'>{IssuesList!==undefined && IssuesList.daoInfo.tokenSymbol}</div>
                                <input type="number" placeholder='0' className='p-[0.5vh] text-right bg-[#4B5563] focus-visible:outline-0' value={addStake} 
                                onChange={(e)=>setAddStake(parseInt(e.target.value))} />
                            </div>
                        </div>
                        <button className='flex flex-row justify-center items-center bg-[#91A8ED] 
                        w-full py-[2.5%] rounded-b-[1vh] text-[2.7vh]' 
                        onClick={()=>{
                            if(addStake!==undefined){
                                if(addStake>0 && addStake<=IssuesList.tokenBalance){
                                    StakeOnIssueFunc()
                                }
                            }
                        }}
                        >
                            <div>Stake</div>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default IssueAction;